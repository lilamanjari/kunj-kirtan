import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { fetchLeadKirtansPage, parseLeadType } from "@/lib/server/leadKirtans";
import { fetchLeadDirectory, OTHER_LEAD_ID, OTHER_LEAD_SLUG } from "@/lib/server/leadDirectory";

export const revalidate = 86400;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const timing = new ServerTiming();
  const { slug } = await context.params;
  const { searchParams } = new URL(req.url);
  const type = parseLeadType(searchParams.get("type"));
  let leadId = searchParams.get("lead_id");
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(50, limitParam)
      : 20;

  if (slug === OTHER_LEAD_SLUG || leadId === OTHER_LEAD_ID) {
    const { otherLeadIds, error: directoryError } =
      await timing.measure("lead", async () => await fetchLeadDirectory());

    if (directoryError) {
      return jsonWithServerTiming(
        { error: directoryError },
        timing,
        { status: 500 },
      );
    }

    if (otherLeadIds.length === 0) {
      return jsonWithServerTiming(
        { error: "Lead singer not found" },
        timing,
        { status: 404 },
      );
    }

    const {
      rows,
      hasMore,
      nextCursor,
      error: kirtanError,
    } = await timing.measure("db", () =>
      fetchLeadKirtansPage({
        leadSingerIds: otherLeadIds,
        type,
        limit,
        cursorRecordedDate: searchParams.get("cursor_recorded_date"),
        cursorTitle: searchParams.get("cursor_title"),
        cursorId: searchParams.get("cursor_id"),
      }),
    );

    if (kirtanError) {
      return jsonWithServerTiming(
        { error: kirtanError },
        timing,
        { status: 500 },
      );
    }

    const ids = rows.map((row) => row.id);
    const { harmoniumIds, rareGemIds, error: tagError } =
      await timing.measure("tags", () => fetchKirtanTagFlags(ids));

    if (tagError) {
      return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
    }

    const kirtans: KirtanSummary[] = rows.map((k) => ({
      id: k.id,
      audio_url: k.audio_url,
      type: k.type as KirtanType,
      title: formatKirtanTitle(k.type as KirtanType, k.title),
      lead_singer: k.lead_singer,
      recorded_date: k.recorded_date,
      recorded_date_precision: k.recorded_date_precision ?? null,
      sanga: k.sanga,
      duration_seconds: k.duration_seconds,
      sequence_num: k.sequence_num ?? null,
      has_harmonium: harmoniumIds.has(k.id),
      is_rare_gem: rareGemIds.has(k.id),
    }));

    return jsonWithServerTiming(
      {
        type,
        has_more: hasMore,
        next_cursor: nextCursor,
        kirtans,
      },
      timing,
    );
  }

  if (!leadId) {
    const { data: lead, error: leadError } = await timing.measure("lead", async () =>
      await supabase
        .from("lead_singers")
        .select("id")
        .eq("slug", slug)
        .maybeSingle(),
    );

    if (leadError || !lead) {
      return jsonWithServerTiming(
        { error: "Lead singer not found" },
        timing,
        { status: 404 },
      );
    }

    leadId = lead.id;
  }

  if (!leadId) {
    return jsonWithServerTiming(
      { error: "Lead singer not found" },
      timing,
      { status: 404 },
    );
  }

  const {
    rows,
    hasMore,
    nextCursor,
    error: kirtanError,
  } = await timing.measure("db", () =>
    fetchLeadKirtansPage({
      leadSingerId: leadId,
      type,
      limit,
      cursorRecordedDate: searchParams.get("cursor_recorded_date"),
      cursorTitle: searchParams.get("cursor_title"),
      cursorId: searchParams.get("cursor_id"),
    }),
  );

  if (kirtanError) {
    return jsonWithServerTiming(
      { error: kirtanError },
      timing,
      { status: 500 },
    );
  }

  const ids = rows.map((row) => row.id);
  const { harmoniumIds, rareGemIds, error: tagError } =
    await timing.measure("tags", () => fetchKirtanTagFlags(ids));

  if (tagError) {
    return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
  }

  const kirtans: KirtanSummary[] = rows.map((k) => ({
    id: k.id,
    audio_url: k.audio_url,
    type: k.type as KirtanType,
    title: formatKirtanTitle(k.type as KirtanType, k.title),
    lead_singer: k.lead_singer,
    recorded_date: k.recorded_date,
    recorded_date_precision: k.recorded_date_precision ?? null,
    sanga: k.sanga,
    duration_seconds: k.duration_seconds,
    sequence_num: k.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(k.id),
    is_rare_gem: rareGemIds.has(k.id),
  }));

  return jsonWithServerTiming(
    {
      type,
      has_more: hasMore,
      next_cursor: nextCursor,
      kirtans,
    },
    timing,
  );
}
