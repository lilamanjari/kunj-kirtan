import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  fetchLeadCounts,
  fetchLeadKirtansPage,
  firstAvailableLeadType,
  parseLeadType,
} from "@/lib/server/leadKirtans";

export const revalidate = 86400;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }, // note: Promise here
) {
  const timing = new ServerTiming();
  const { searchParams } = new URL(req.url);
  const requestedType = parseLeadType(searchParams.get("type"));
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const cursorRecordedDate = searchParams.get("cursor_recorded_date");
  const cursorTitle = searchParams.get("cursor_title");
  const cursorId = searchParams.get("cursor_id");
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(50, limitParam)
      : 20;

  // unwrap the promise
  const { slug } = await context.params;

  /* 1. Load lead singer */
  const { data: lead, error: leadError } = await timing.measure("lead", async () =>
    await supabase
      .from("lead_singers")
      .select("id, display_name")
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

  const { counts, error: countsError } = await timing.measure("counts", () =>
    fetchLeadCounts(lead.id),
  );
  if (countsError) {
    return jsonWithServerTiming(
      { error: countsError },
      timing,
      { status: 500 },
    );
  }

  const activeType = requestedType && counts[requestedType] > 0
    ? requestedType
    : firstAvailableLeadType(counts);

  const { kirtan: featuredData, error: featuredError } =
    await timing.measure("featured", () =>
      getDailyRareGem({ leadSingerId: lead.id }),
    );

  if (featuredError) {
    return jsonWithServerTiming(
      { error: featuredError },
      timing,
      { status: 500 },
    );
  }

  const {
    rows,
    hasMore,
    nextCursor,
    error: kirtanError,
  } = await timing.measure("db", () =>
    fetchLeadKirtansPage({
      leadSingerId: lead.id,
      type: activeType,
      limit,
      cursorRecordedDate,
      cursorTitle,
      cursorId,
    }),
  );

  if (kirtanError) {
    return jsonWithServerTiming(
      { error: kirtanError },
      timing,
      { status: 500 },
    );
  }

  const ids = rows.map((k) => k.id);
  if (featuredData?.id) {
    ids.unshift(featuredData.id);
  }
  const { harmoniumIds, rareGemIds, error: tagError } =
    await timing.measure("tags", () => fetchKirtanTagFlags(ids));

  if (tagError) {
    return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
  }

  const featured: KirtanSummary | null = featuredData
    ? {
        id: featuredData.id,
        audio_url: featuredData.audio_url,
        type: featuredData.type as KirtanType,
        title: formatKirtanTitle(
          featuredData.type as KirtanType,
          featuredData.title,
        ),
        lead_singer: featuredData.lead_singer,
        recorded_date: featuredData.recorded_date,
        recorded_date_precision: featuredData.recorded_date_precision ?? null,
        sanga: featuredData.sanga,
        duration_seconds: featuredData.duration_seconds,
        sequence_num: featuredData.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(featuredData.id),
        is_rare_gem: rareGemIds.has(featuredData.id),
      }
    : null;

  return jsonWithServerTiming(
    {
      lead,
      counts,
      active_type: activeType,
      has_more: hasMore,
      next_cursor: nextCursor,
      kirtans:
        rows.map((k) => ({
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
        })),
      featured,
    },
    timing,
  );
}
