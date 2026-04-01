import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { formatKirtanTitle } from "@/lib/kirtanTitle";

export const revalidate = 86400;

const TYPE_ORDER: KirtanType[] = ["MM", "BHJ", "HK"];

type TypeCounts = Record<KirtanType, number>;

function parseType(value: string | null): KirtanType | null {
  if (value === "MM" || value === "BHJ" || value === "HK") {
    return value;
  }
  return null;
}

function firstAvailableType(counts: TypeCounts): KirtanType | null {
  return TYPE_ORDER.find((type) => counts[type] > 0) ?? null;
}

function emptyCounts(): TypeCounts {
  return { MM: 0, BHJ: 0, HK: 0 };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }, // note: Promise here
) {
  const timing = new ServerTiming();
  const { searchParams } = new URL(req.url);
  const requestedType = parseType(searchParams.get("type"));
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

  const countResults = await timing.measure("counts", () =>
    Promise.all(
      TYPE_ORDER.map(async (type) => {
        const { count, error } = await supabase
          .from("playable_kirtans")
          .select("id", { count: "exact", head: true })
          .eq("lead_singer_id", lead.id)
          .eq("type", type);

        return { type, count: count ?? 0, error };
      }),
    ),
  );

  const countError = countResults.find((result) => result.error);
  if (countError?.error) {
    return jsonWithServerTiming(
      { error: countError.error.message },
      timing,
      { status: 500 },
    );
  }

  const counts = countResults.reduce<TypeCounts>((acc, result) => {
    acc[result.type] = result.count;
    return acc;
  }, emptyCounts());

  const activeType = requestedType && counts[requestedType] > 0
    ? requestedType
    : firstAvailableType(counts);

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

  let query = supabase
    .from("playable_kirtans")
    .select("*")
    .eq("lead_singer_id", lead.id);

  if (activeType) {
    query = query.eq("type", activeType);
    if (activeType === "BHJ") {
      query = query.order("title", { ascending: true }).order("id", {
        ascending: true,
      });
      if (cursorTitle && cursorId) {
        const safeTitle = cursorTitle.replace(/"/g, '\\"');
        query = query.or(
          `title.gt."${safeTitle}",and(title.eq."${safeTitle}",id.gt.${cursorId})`,
        );
      }
    } else {
      query = query
        .order("recorded_date", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
      if (cursorRecordedDate && cursorId) {
        query = query.or(
          `recorded_date.lt.${cursorRecordedDate},and(recorded_date.eq.${cursorRecordedDate},id.lt.${cursorId})`,
        );
      } else if (cursorId) {
        query = query.is("recorded_date", null).lt("id", cursorId);
      }
    }
  } else {
    query = query
      .order("recorded_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });
  }

  const { data: kirtans, error: kirtanError } = await timing.measure("db", async () =>
    await query.limit(limit + 1),
  );

  if (kirtanError) {
    return jsonWithServerTiming(
      { error: kirtanError.message },
      timing,
      { status: 500 },
    );
  }

  const rows = activeType && (kirtans ?? []).length > limit
    ? (kirtans ?? []).slice(0, limit)
    : (kirtans ?? []);
  const hasMore = activeType ? (kirtans ?? []).length > limit : false;
  const last = rows[rows.length - 1];

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
      next_cursor: !last
        ? null
        : activeType === "BHJ"
          ? { title: last.title, id: last.id }
          : { recorded_date: last.recorded_date, id: last.id },
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
