import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { publishCanonicalAudio } from "@/lib/server/adminAudioMutations";
import {
  buildReplacementAudioStorageKey,
  deleteAudioFromR2,
  getAudioPublicUrl,
  uploadAudioToR2,
} from "@/lib/server/r2KirtanAudio";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  let tempDir: string | null = null;
  let nextStorageKey: string | null = null;

  try {
    const { id } = await context.params;
    const { data: audioFile, error: audioFileError } = await supabaseAdmin
      .from("audio_files")
      .select("id, file_url, file_name, duration_seconds")
      .eq("kirtan_id", id)
      .eq("is_current", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (audioFileError) {
      return NextResponse.json({ error: audioFileError.message }, { status: 500 });
    }

    if (!audioFile?.id || !audioFile.file_url || !audioFile.file_name) {
      return NextResponse.json(
        { error: "No current audio file exists for this kirtan yet." },
        { status: 400 },
      );
    }

    const recordedDurationSeconds = Number(audioFile.duration_seconds);
    if (
      !Number.isFinite(recordedDurationSeconds) ||
      recordedDurationSeconds <= 0
    ) {
      return NextResponse.json(
        { error: "The current audio duration is unavailable." },
        { status: 400 },
      );
    }
    const durationSeconds = Math.max(1, Math.round(recordedDurationSeconds));

    const upstreamResponse = await fetch(audioFile.file_url, {
      cache: "no-store",
    });
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio file (${upstreamResponse.status})` },
        { status: 502 },
      );
    }

    tempDir = path.join(os.tmpdir(), `kirtan-normalize-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const inputPath = path.join(tempDir, `input-${audioFile.file_name}`);
    const outputFileName = `${audioFile.file_name.replace(/\.[^.]+$/, "")}.m4a`;
    const outputPath = path.join(tempDir, `normalized-${outputFileName}`);
    await fs.writeFile(inputPath, Buffer.from(await upstreamResponse.arrayBuffer()));

    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-af",
      "loudnorm=I=-16:TP=-1.5:LRA=11",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      outputPath,
    ]);

    nextStorageKey = buildReplacementAudioStorageKey({
      currentAudioUrl: audioFile.file_url,
      kirtanId: id,
      fileName: outputFileName,
    });
    await uploadAudioToR2({
      storageKey: nextStorageKey,
      body: new Uint8Array(await fs.readFile(outputPath)),
      fileName: outputFileName,
      contentType: "audio/mp4",
    });

    let result: Awaited<ReturnType<typeof publishCanonicalAudio>>;
    try {
      result = await publishCanonicalAudio({
        kirtanId: id,
        audioFileId: audioFile.id,
        currentAudioUrl: audioFile.file_url,
        nextAudioUrl: getAudioPublicUrl(nextStorageKey),
        fileName: outputFileName,
        durationSeconds,
        driveFileId: `manual-normalize:${id}:${Date.now()}`,
      });
    } catch (publishError) {
      try {
        await deleteAudioFromR2(nextStorageKey);
      } catch {}
      nextStorageKey = null;
      throw publishError;
    }

    return NextResponse.json({
      ok: true,
      kirtan: result.kirtan,
      cleanupWarning: result.cleanupWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to normalize audio",
      },
      { status: 500 },
    );
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
