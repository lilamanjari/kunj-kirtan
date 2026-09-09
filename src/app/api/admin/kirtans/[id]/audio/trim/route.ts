import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { getAdminKirtanDetail } from "@/lib/admin/data";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { publishCanonicalAudio } from "@/lib/server/adminAudioMutations";
import {
  buildInitialAudioStorageKey,
  buildReplacementAudioStorageKey,
  deleteAudioFromR2,
  getAudioPublicUrl,
  uploadAudioToR2,
} from "@/lib/server/r2KirtanAudio";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { KirtanType } from "@/types/kirtan";

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

async function getNextSequenceNum(leadSingerId: string | null) {
  if (!leadSingerId) {
    return 1;
  }

  const { data, error } = await supabaseAdmin
    .from("kirtans")
    .select("sequence_num")
    .eq("lead_singer_id", leadSingerId)
    .eq("type", "MM")
    .order("sequence_num", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Number(data?.[0]?.sequence_num ?? 0) + 1;
}

async function cleanupCopiedKirtan(kirtanId: string) {
  await supabaseAdmin.from("kirtan_tags").delete().eq("kirtan_id", kirtanId);
  await supabaseAdmin.from("kirtan_titles").delete().eq("kirtan_id", kirtanId);
  await supabaseAdmin.from("audio_files").delete().eq("kirtan_id", kirtanId);
  await supabaseAdmin.from("kirtans").delete().eq("id", kirtanId);
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
      saveAsNew?: boolean;
      removeSelection?: boolean;
    };

    const startSeconds = Number(body.startSeconds);
    const endSeconds = Number(body.endSeconds);
    const saveAsNew = body.saveAsNew === true;
    const removeSelection = body.removeSelection === true;

    if (saveAsNew && removeSelection) {
      return NextResponse.json(
        { error: "A removed selection cannot be saved as a new kirtan." },
        { status: 400 },
      );
    }

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

    if (
      removeSelection &&
      currentDuration > 0 &&
      currentDuration - (endSeconds - startSeconds) < 0.5
    ) {
      return NextResponse.json(
        { error: "Remove Selection must leave some audio in the track." },
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

    if (removeSelection) {
      await execFileAsync(FFMPEG_PATH, [
        "-y",
        "-i",
        inputPath,
        "-filter_complex",
        `[0:a]atrim=0:${formatTrimSeconds(startSeconds)},asetpts=PTS-STARTPTS[before];[0:a]atrim=${formatTrimSeconds(endSeconds)},asetpts=PTS-STARTPTS[after];[before][after]concat=n=2:v=0:a=1[output]`,
        "-map",
        "[output]",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        outputPath,
      ]);
    } else {
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
    }

    const trimmedBuffer = new Uint8Array(await fs.readFile(outputPath));
    const trimmedDurationSeconds = Math.max(
      1,
      Math.round(
        removeSelection
          ? currentDuration - (endSeconds - startSeconds)
          : endSeconds - startSeconds,
      ),
    );

    if (saveAsNew) {
      const { data: sourceKirtan, error: sourceKirtanError } =
        await supabaseAdmin
          .from("kirtans")
          .select(
            "title, type, lead_singer_id, sanga_id, recorded_date, recorded_date_precision",
          )
          .eq("id", id)
          .maybeSingle();

      if (sourceKirtanError) {
        return NextResponse.json(
          { error: sourceKirtanError.message },
          { status: 500 },
        );
      }

      const sourceType = sourceKirtan?.type as KirtanType | undefined;
      if (
        !sourceKirtan ||
        (sourceType !== "MM" && sourceType !== "BHJ" && sourceType !== "HK")
      ) {
        return NextResponse.json(
          { error: "Source kirtan could not be found." },
          { status: 404 },
        );
      }

      const newKirtanId = randomUUID();
      const nextStorageKey = buildInitialAudioStorageKey({
        type: sourceType,
        kirtanId: newKirtanId,
        fileName: trimmedFileName,
      });
      let audioUploaded = false;
      let kirtanInserted = false;

      try {
        await uploadAudioToR2({
          storageKey: nextStorageKey,
          body: trimmedBuffer,
          fileName: trimmedFileName,
          contentType: "audio/mp4",
        });
        audioUploaded = true;

        const sequenceNum =
          sourceType === "MM"
            ? await getNextSequenceNum(sourceKirtan.lead_singer_id ?? null)
            : null;
        const { error: insertKirtanError } = await supabaseAdmin
          .from("kirtans")
          .insert({
            id: newKirtanId,
            title: sourceKirtan.title ?? "",
            type: sourceType,
            lead_singer_id: sourceKirtan.lead_singer_id ?? null,
            sanga_id: sourceKirtan.sanga_id ?? null,
            recorded_date: sourceKirtan.recorded_date ?? null,
            recorded_date_precision: sourceKirtan.recorded_date_precision ?? null,
            sequence_num: sequenceNum,
            published: false,
            updated_at: new Date().toISOString(),
          });

        if (insertKirtanError) {
          throw new Error(insertKirtanError.message);
        }
        kirtanInserted = true;

        const { error: insertAudioError } = await supabaseAdmin
          .from("audio_files")
          .insert({
            kirtan_id: newKirtanId,
            drive_file_id: `manual-trim:${newKirtanId}:${Date.now()}`,
            file_name: trimmedFileName,
            file_url: getAudioPublicUrl(nextStorageKey),
            is_current: true,
            duration_seconds: trimmedDurationSeconds,
          });

        if (insertAudioError) {
          throw new Error(insertAudioError.message);
        }

        const [titlesResult, tagsResult] = await Promise.all([
          supabaseAdmin
            .from("kirtan_titles")
            .select("kind, title")
            .eq("kirtan_id", id),
          supabaseAdmin
            .from("kirtan_tags")
            .select("tag_id")
            .eq("kirtan_id", id),
        ]);

        if (titlesResult.error) {
          throw new Error(titlesResult.error.message);
        }
        if (tagsResult.error) {
          throw new Error(tagsResult.error.message);
        }

        const titleRows = (titlesResult.data ?? [])
          .filter(
            (row) =>
              (row.kind === "first_line" || row.kind === "official") &&
              Boolean(row.title),
          )
          .map((row) => ({
            kirtan_id: newKirtanId,
            kind: row.kind as "first_line" | "official",
            title: row.title!,
          }));
        if (titleRows.length > 0) {
          const { error: insertTitlesError } = await supabaseAdmin
            .from("kirtan_titles")
            .insert(titleRows);
          if (insertTitlesError) {
            throw new Error(insertTitlesError.message);
          }
        }

        const tagRows = (tagsResult.data ?? []).map((row) => ({
          kirtan_id: newKirtanId,
          tag_id: row.tag_id,
        }));
        if (tagRows.length > 0) {
          const { error: insertTagsError } = await supabaseAdmin
            .from("kirtan_tags")
            .insert(tagRows);
          if (insertTagsError) {
            throw new Error(insertTagsError.message);
          }
        }

        revalidateCmsAndPublicContent();

        return NextResponse.json({
          ok: true,
          id: newKirtanId,
          kirtan: await getAdminKirtanDetail(newKirtanId),
        });
      } catch (copyError) {
        if (kirtanInserted) {
          try {
            await cleanupCopiedKirtan(newKirtanId);
          } catch {}
        }
        if (audioUploaded) {
          try {
            await deleteAudioFromR2(nextStorageKey);
          } catch {}
        }
        return NextResponse.json(
          {
            error:
              copyError instanceof Error
                ? copyError.message
                : "Failed to save trimmed audio as a new kirtan",
          },
          { status: 500 },
        );
      }
    }

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
    const manualDriveFileId = `manual-${
      removeSelection ? "remove-selection" : "trim"
    }:${id}:${Date.now()}`;

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
