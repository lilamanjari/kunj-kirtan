import { NextResponse } from "next/server";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import {
  createUnpublishedPreviewToken,
  hasUnpublishedPreviewAccess,
  isUnpublishedPreviewConfigured,
  isValidUnpublishedPreviewPassphrase,
  UNPUBLISHED_PREVIEW_COOKIE,
  UNPUBLISHED_PREVIEW_TTL_SECONDS,
} from "@/lib/server/unpublishedPreview";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
  });
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET() {
  if (!isUnpublishedPreviewConfigured()) return json({ error: "Preview unavailable" }, 404);
  if (!(await hasUnpublishedPreviewAccess())) return json({ error: "Preview locked" }, 401);

  const { data, error } = await supabaseAdmin
    .from("kirtans")
    .select(`
      id, type, title, recorded_date, recorded_date_precision, sequence_num,
      lead_singer_id, lead_singers(display_name), sangas(name),
      audio_files!inner(file_url, duration_seconds, is_current),
      kirtan_titles!left(kind, title)
    `)
    .eq("published", false)
    .eq("audio_files.is_current", true)
    .order("recorded_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return json({ error: "Could not load unpublished kirtans" }, 503);

  const kirtans: KirtanSummary[] = (data ?? []).flatMap((row) => {
    const audio = firstRelation(row.audio_files);
    if (!audio?.file_url) return [];
    const singer = firstRelation(row.lead_singers);
    const sanga = firstRelation(row.sangas);
    const titles = Array.isArray(row.kirtan_titles) ? row.kirtan_titles : row.kirtan_titles ? [row.kirtan_titles] : [];
    const officialTitle = titles.find((item) => item.kind === "official")?.title ?? null;
    const firstLineTitle = titles.find((item) => item.kind === "first_line")?.title ?? null;
    const type = row.type as KirtanType;
    return [{
      id: row.id,
      audio_url: audio.file_url,
      type,
      title: getDisplayKirtanTitle({
        type,
        title: row.title ?? "Untitled",
        official_title: officialTitle,
        first_line_title: firstLineTitle,
      }),
      lead_singer: singer?.display_name ?? null,
      lead_singer_id: row.lead_singer_id ?? null,
      recorded_date: row.recorded_date ?? null,
      recorded_date_precision: row.recorded_date_precision ?? null,
      sanga: sanga?.name ?? "",
      duration_seconds: audio.duration_seconds ?? null,
      sequence_num: row.sequence_num ?? null,
      private_preview: true,
    }];
  });

  return json({ kirtans });
}

export async function POST(request: Request) {
  if (!isUnpublishedPreviewConfigured()) return json({ error: "Preview unavailable" }, 404);
  let body: { passphrase?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Enter the preview passphrase" }, 400);
  }
  if (!isValidUnpublishedPreviewPassphrase(body.passphrase)) {
    return json({ error: "That preview passphrase is not correct" }, 401);
  }

  const token = createUnpublishedPreviewToken();
  if (!token) return json({ error: "Preview unavailable" }, 404);
  const response = json({ ok: true });
  response.cookies.set(UNPUBLISHED_PREVIEW_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: UNPUBLISHED_PREVIEW_TTL_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = json({ ok: true });
  response.cookies.set(UNPUBLISHED_PREVIEW_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
