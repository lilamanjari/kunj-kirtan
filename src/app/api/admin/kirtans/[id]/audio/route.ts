import { NextResponse } from "next/server";
import {
  MAX_ADMIN_AUDIO_UPLOAD_BYTES,
  formatBytes,
  isAllowedAdminAudioFile,
} from "@/lib/admin/audioUpload";
import {
  buildReplacementAudioStorageKey,
  deleteAudioFromR2,
  getAudioPublicUrl,
  uploadAudioToR2,
} from "@/lib/server/r2KirtanAudio";
import { publishCanonicalAudio } from "@/lib/server/adminAudioMutations";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const SIZE_DIFFERENCE_THRESHOLD = 0.3;

async function getRemoteFileSizeBytes(url: string) {
  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    const contentLength = headResponse.headers.get("content-length");
    if (contentLength) {
      const parsed = Number(contentLength);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const formData = await req.formData();
    const uploaded = formData.get("audio");
    const durationRaw = formData.get("durationSeconds");
    const confirmLargeDifference =
      String(formData.get("confirmLargeDifference") ?? "") === "true";

    if (!(uploaded instanceof File)) {
      return NextResponse.json(
        { error: "No replacement audio file was provided." },
        { status: 400 },
      );
    }

    if (!isAllowedAdminAudioFile(uploaded)) {
      return NextResponse.json(
        { error: "Unsupported audio format. Please choose a valid audio file." },
        { status: 400 },
      );
    }

    if (uploaded.size <= 0) {
      return NextResponse.json(
        { error: "The selected audio file is empty." },
        { status: 400 },
      );
    }

    if (uploaded.size > MAX_ADMIN_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `Audio files must be ${formatBytes(MAX_ADMIN_AUDIO_UPLOAD_BYTES)} or smaller.`,
        },
        { status: 400 },
      );
    }

    const parsedDurationSeconds = Number(durationRaw);
    if (
      !Number.isFinite(parsedDurationSeconds) ||
      parsedDurationSeconds <= 0
    ) {
      return NextResponse.json(
        { error: "The selected audio file duration could not be read." },
        { status: 400 },
      );
    }
    const durationSeconds = Math.max(1, Math.round(parsedDurationSeconds));

    const { data: audioFile, error: audioFileError } = await supabaseAdmin
      .from("audio_files")
      .select("id, file_url, drive_file_id")
      .eq("kirtan_id", id)
      .eq("is_current", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (audioFileError) {
      return NextResponse.json({ error: audioFileError.message }, { status: 500 });
    }

    if (!audioFile?.id || !audioFile.file_url) {
      return NextResponse.json(
        { error: "No current audio file exists for this kirtan yet." },
        { status: 400 },
      );
    }

    const existingSizeBytes = await getRemoteFileSizeBytes(audioFile.file_url);
    if (
      existingSizeBytes &&
      existingSizeBytes > 0 &&
      !confirmLargeDifference
    ) {
      const smallerThanThreshold =
        uploaded.size < existingSizeBytes * (1 - SIZE_DIFFERENCE_THRESHOLD);
      const largerThanThreshold =
        uploaded.size > existingSizeBytes * (1 + SIZE_DIFFERENCE_THRESHOLD);

      if (smallerThanThreshold || largerThanThreshold) {
        return NextResponse.json(
          {
            error:
              "The new file size looks very different from the current audio file.",
            requiresConfirmation: true,
            existingSizeBytes,
            newSizeBytes: uploaded.size,
            message: `Current file: ${formatBytes(existingSizeBytes)}. New file: ${formatBytes(uploaded.size)}. Please confirm that this is the correct replacement.`,
          },
          { status: 409 },
        );
      }
    }

    const manualDriveFileId = `manual-replace:${id}:${Date.now()}`;
    const nextStorageKey = buildReplacementAudioStorageKey({
      currentAudioUrl: audioFile.file_url,
      kirtanId: id,
      fileName: uploaded.name,
    });

    const body = new Uint8Array(await uploaded.arrayBuffer());
    await uploadAudioToR2({
      storageKey: nextStorageKey,
      body,
      fileName: uploaded.name,
      contentType: uploaded.type,
    });

    const nextFileUrl = getAudioPublicUrl(nextStorageKey);

    let result: Awaited<ReturnType<typeof publishCanonicalAudio>>;
    try {
      result = await publishCanonicalAudio({
        kirtanId: id,
        audioFileId: audioFile.id,
        currentAudioUrl: audioFile.file_url,
        nextAudioUrl: nextFileUrl,
        fileName: uploaded.name,
        durationSeconds,
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
              : "Failed to publish replacement audio",
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
        error:
          error instanceof Error ? error.message : "Failed to replace audio file",
      },
      { status: 500 },
    );
  }
}
