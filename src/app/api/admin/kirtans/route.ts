import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  MAX_ADMIN_AUDIO_UPLOAD_BYTES,
  isAllowedAdminAudioFile,
} from "@/lib/admin/audioUpload";
import { revalidateCmsAndPublicContent } from "@/lib/admin/revalidate";
import { listAdminKirtans } from "@/lib/admin/data";
import {
  buildInitialAudioStorageKey,
  deleteAudioFromR2,
  getAudioPublicUrl,
  uploadAudioToR2,
} from "@/lib/server/r2KirtanAudio";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { KirtanType } from "@/types/kirtan";

function isEditableType(value: unknown): value is KirtanType {
  return value === "MM" || value === "BHJ" || value === "HK";
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

  const max = data?.[0]?.sequence_num ?? 0;
  return Number(max) + 1;
}

function parseRecordedDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      recorded_date: null,
      recorded_date_precision: null,
    };
  }

  const normalized = trimmed.replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Recorded date must be in yyyy/mm/dd format.");
  }

  return {
    recorded_date: `${match[1]}-${match[2]}-${match[3]}`,
    recorded_date_precision: "day" as const,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const selectedId = searchParams.get("selected");

    const result = await listAdminKirtans({
      search,
      type: type === "MM" || type === "BHJ" || type === "HK" ? type : "all",
      status:
        status === "published" || status === "hidden" || status === "all"
          ? status
          : "all",
      selectedId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load kirtans",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  let uploadedStorageKey: string | null = null;

  try {
    const formData = await req.formData();
    const type = formData.get("type");
    const leadSingerId = String(formData.get("leadSingerId") ?? "").trim();
    const sangaIdValue = String(formData.get("sangaId") ?? "").trim();
    const publishedValue = String(formData.get("published") ?? "false").trim();
    const recordedDateInput = String(formData.get("recordedDate") ?? "").trim();
    const firstLineTitle = String(formData.get("firstLineTitle") ?? "").trim();
    const officialTitle = String(formData.get("officialTitle") ?? "").trim();
    const baseTitle = String(formData.get("baseTitle") ?? "").trim();
    const durationSecondsRaw = Number(formData.get("durationSeconds"));
    const audio = formData.get("audio");

    if (!isEditableType(type)) {
      return NextResponse.json({ error: "A valid kirtan type is required." }, { status: 400 });
    }

    if (!leadSingerId) {
      return NextResponse.json({ error: "Lead singer is required." }, { status: 400 });
    }

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    if (!isAllowedAdminAudioFile(audio)) {
      return NextResponse.json(
        { error: "Unsupported audio format. Please choose a valid audio file." },
        { status: 400 },
      );
    }

    if (audio.size <= 0 || audio.size > MAX_ADMIN_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Audio file size is invalid." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(durationSecondsRaw) || durationSecondsRaw <= 0) {
      return NextResponse.json(
        { error: "Audio duration is required." },
        { status: 400 },
      );
    }

    if (type === "BHJ" && !firstLineTitle) {
      return NextResponse.json(
        { error: "First line title is required for bhajans." },
        { status: 400 },
      );
    }

    if (type === "HK" && !baseTitle) {
      return NextResponse.json(
        { error: "Base title is required for Hari Katha." },
        { status: 400 },
      );
    }

    const { recorded_date, recorded_date_precision } =
      parseRecordedDateInput(recordedDateInput);
    const published = publishedValue === "true";
    const kirtanId = randomUUID();
    const durationSeconds = Math.max(1, Math.round(durationSecondsRaw));
    const title =
      type === "MM"
        ? "Maha Mantra"
        : type === "BHJ"
          ? officialTitle || firstLineTitle
          : baseTitle;
    const sequenceNum =
      type === "MM" ? await getNextSequenceNum(leadSingerId) : null;
    const storageKey = buildInitialAudioStorageKey({
      type,
      kirtanId,
      fileName: audio.name,
    });

    await uploadAudioToR2({
      storageKey,
      body: new Uint8Array(await audio.arrayBuffer()),
      fileName: audio.name,
      contentType: audio.type,
    });
    uploadedStorageKey = storageKey;

    const { error: insertKirtanError } = await supabaseAdmin.from("kirtans").insert({
      id: kirtanId,
      title,
      type,
      lead_singer_id: leadSingerId,
      sanga_id: sangaIdValue || null,
      recorded_date,
      recorded_date_precision,
      sequence_num: sequenceNum,
      published,
      updated_at: new Date().toISOString(),
    });

    if (insertKirtanError) {
      throw new Error(insertKirtanError.message);
    }

    const { error: insertAudioError } = await supabaseAdmin
      .from("audio_files")
      .insert({
        kirtan_id: kirtanId,
        drive_file_id: `manual-create:${kirtanId}:${Date.now()}`,
        file_name: audio.name,
        file_url: getAudioPublicUrl(storageKey),
        is_current: true,
        duration_seconds: durationSeconds,
      });

    if (insertAudioError) {
      throw new Error(insertAudioError.message);
    }

    if (type === "BHJ") {
      const titleRows: Array<{
        kirtan_id: string;
        kind: "first_line" | "official";
        title: string;
      }> = [
        {
          kirtan_id: kirtanId,
          kind: "first_line" as const,
          title: firstLineTitle,
        },
      ];

      if (officialTitle && officialTitle !== firstLineTitle) {
        titleRows.push({
          kirtan_id: kirtanId,
          kind: "official" as const,
          title: officialTitle,
        });
      }

      const { error: insertTitlesError } = await supabaseAdmin
        .from("kirtan_titles")
        .insert(titleRows);

      if (insertTitlesError) {
        throw new Error(insertTitlesError.message);
      }
    }

    revalidateCmsAndPublicContent();

    return NextResponse.json({
      ok: true,
      id: kirtanId,
    });
  } catch (error) {
    if (uploadedStorageKey) {
      try {
        await deleteAudioFromR2(uploadedStorageKey);
      } catch {}
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create kirtan",
      },
      { status: 500 },
    );
  }
}
