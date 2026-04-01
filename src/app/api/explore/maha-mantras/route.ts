import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { formatKirtanTitle } from "@/lib/kirtanTitle";

export const revalidate = 86400;

export async function GET(req: Request) {
  const timing = new ServerTiming();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const durationKey = searchParams.get("duration");
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const cursorRecordedDate = searchParams.get("cursor_recorded_date");
  const cursorId = searchParams.get("cursor_id");

  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(50, limitParam)
      : 20;

  const durationRanges: Record<
    string,
    { min: number | null; max: number | null }
  > = {
    UNDER_10: { min: null, max: 10 * 60 },
    BETWEEN_10_20: { min: 10 * 60, max: 20 * 60 },
    BETWEEN_20_30: { min: 20 * 60, max: 30 * 60 },
    OVER_30: { min: 30 * 60, max: null },
  };

  let query = supabase
    .from("playable_kirtans")
    .select(
      "id, audio_url, type, title, lead_singer, recorded_date, recorded_date_precision, sanga, duration_seconds, created_at, sequence_num",
    )
    .eq("type", "MM")
    .order("recorded_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (search) {
    query = query.ilike("lead_singer", `%${search}%`);
  }

  const featured = await timing.measure("featured", () =>
    getDailyRareGem({ type: "MM" }),
  );

  if (featured.error) {
    return jsonWithServerTiming(
      { error: featured.error },
      timing,
      { status: 500 },
    );
  }

  if (durationKey && durationKey !== "ALL") {
    const range = durationRanges[durationKey];
    if (range) {
      if (range.min !== null) {
        query = query.gte("duration_seconds", range.min);
      }
      if (range.max !== null) {
        query = query.lte("duration_seconds", range.max);
      }
    }
  }

  if (cursorRecordedDate && cursorId) {
    query = query.or(
      `recorded_date.lt.${cursorRecordedDate},and(recorded_date.eq.${cursorRecordedDate},id.lt.${cursorId})`,
    );
  } else if (cursorId) {
    query = query.is("recorded_date", null).lt("id", cursorId);
  }

  const { data, error } = await timing.measure("db", async () => await query);

  if (error) {
    return jsonWithServerTiming(
      { error: error.message },
      timing,
      { status: 500 },
    );
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const ids = page.map((k) => k.id);
  if (featured.kirtan?.id) {
    ids.unshift(featured.kirtan.id);
  }
  const { harmoniumIds, rareGemIds, error: tagError } =
    await timing.measure("tags", () => fetchKirtanTagFlags(ids));

  if (tagError) {
    return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
  }

  const mantras: KirtanSummary[] = page.map((k) => ({
    id: k.id,
    audio_url: k.audio_url,
    type: "MM",
    title: formatKirtanTitle("MM", k.title),
    lead_singer: k.lead_singer,
    recorded_date: k.recorded_date,
    recorded_date_precision: k.recorded_date_precision ?? null,
    sanga: k.sanga,
    duration_seconds: k.duration_seconds,
    sequence_num: k.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(k.id),
    is_rare_gem: rareGemIds.has(k.id),
  }));

  const featuredKirtan: KirtanSummary | null = featured.kirtan
    ? {
        id: featured.kirtan.id,
        audio_url: featured.kirtan.audio_url,
        type: "MM",
        title: formatKirtanTitle("MM", featured.kirtan.title),
        lead_singer: featured.kirtan.lead_singer,
        recorded_date: featured.kirtan.recorded_date,
        recorded_date_precision: featured.kirtan.recorded_date_precision ?? null,
        sanga: featured.kirtan.sanga,
        duration_seconds: featured.kirtan.duration_seconds,
        sequence_num: featured.kirtan.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(featured.kirtan.id),
        is_rare_gem: rareGemIds.has(featured.kirtan.id),
      }
    : null;

  const last = page[page.length - 1];

  return jsonWithServerTiming(
    {
      mantras,
      has_more: hasMore,
      next_cursor: last
        ? { recorded_date: last.recorded_date, id: last.id }
        : null,
      featured: featuredKirtan,
    },
    timing,
  );
}
