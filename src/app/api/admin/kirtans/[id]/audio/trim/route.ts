import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
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

function formatTrimSeconds(value: number) {
  return value.toFixed(3);
}

async function cleanupFiles(paths: string[]) {
  await Promise.all(
    paths.map(async (targetPath) => {
      try {
        await fs.unlink(targetPath);
      } catch {}
    }),
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const tempPaths: string[] = [];

  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      startSeconds?: number;
      endSeconds?: number;
    };

    const startSeconds = Number(body.startSeconds);
    const endSeconds = Number(body.endSeconds);

    if (!Number.isFinite(startSeconds) || startSeconds < 0) {
      return NextResponse.json(
        { error: "Trim start time is invalid." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(endSeconds) || endSeconds <= 0) {
      return NextResponse.json(
        { error: "Trim end time is invalid." },
        { status: 400 },
      );
    }

    if (endSeconds <= startSeconds) {
      return NextResponse.json(
        { error: "Trim end must be later than trim start." },
        { status: 400 },
      );
    }

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

    const currentDuration = Number(audioFile.duration_seconds ?? 0);
    if (Number.isFinite(currentDuration) && currentDuration > 0 && endSeconds > currentDuration) {
      return NextResponse.json(
        { error: "Trim end is beyond the current audio duration." },
        { status: 400 },
      );
    }

    const upstreamResponse = await fetch(audioFile.file_url, {
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio file (${upstreamResponse.status})` },
        { status: 502 },
      );
    }

    const sourceBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    const tempDir = path.join(os.tmpdir(), `kirtan-trim-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const trimmedFileName = audioFile.file_name.replace(/\.[^.]+$/, "") + ".m4a";

    const inputPath = path.join(tempDir, `input-${audioFile.file_name}`);
    const outputPath = path.join(tempDir, `trimmed-${trimmedFileName}`);
    tempPaths.push(inputPath, outputPath);

    await fs.writeFile(inputPath, sourceBuffer);

    await execFileAsync(FFMPEG_PATH, [
      "-y",
      "-i",
      inputPath,
      "-ss",
      formatTrimSeconds(startSeconds),
      "-to",
      formatTrimSeconds(endSeconds),
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      outputPath,
    ]);

    const trimmedBuffer = new Uint8Array(await fs.readFile(outputPath));
    const trimmedDurationSeconds = Math.max(
      1,
      Math.round(endSeconds - startSeconds),
    );
    const nextStorageKey = buildReplacementAudioStorageKey({
      currentAudioUrl: audioFile.file_url,
      kirtanId: id,
      fileName: trimmedFileName,
    });

    await uploadAudioToR2({
      storageKey: nextStorageKey,
      body: trimmedBuffer,
      fileName: audioFile.file_name,
      contentType: "audio/mp4",
    });

    const nextFileUrl = getAudioPublicUrl(nextStorageKey);
    const manualDriveFileId = `manual-trim:${id}:${Date.now()}`;

    let result: Awaited<ReturnType<typeof publishCanonicalAudio>>;
    try {
      result = await publishCanonicalAudio({
        kirtanId: id,
        audioFileId: audioFile.id,
        currentAudioUrl: audioFile.file_url,
        nextAudioUrl: nextFileUrl,
        fileName: trimmedFileName,
        durationSeconds: trimmedDurationSeconds,
        driveFileId: manualDriveFileId,
      });
    } catch (publishError) {
      try {
        await deleteAudioFromR2(nextStorageKey);
      } catch {}
      return NextResponse.json(
        {
          error:
            publishError instanceof Error
              ? publishError.message
              : "Failed to publish trimmed audio",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      kirtan: result.kirtan,
      cleanupWarning: result.cleanupWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to trim audio",
      },
      { status: 500 },
    );
  } finally {
    await cleanupFiles(tempPaths);
  }
}
