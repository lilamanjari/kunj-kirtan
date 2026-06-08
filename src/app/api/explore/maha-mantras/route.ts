// JSON API for the Maha Mantra page.
// This handles client-side refetching, filters, and pagination after the initial SSR load.
import { supabase } from "@/lib/supabase";
import { getDailyRareGem } from "@/lib/server/featured";
import {
  fetchMahaMantraCollectionCounts,
  fetchMahaMantraCollectionIds,
  type MahaMantraCollectionKey,
} from "@/lib/server/mahaMantraCollections";
import { buildMahaMantraPresentation } from "@/lib/server/mahaMantraPresentation";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";

export const revalidate = 86400;

export async function GET(req: Request) {
  const timing = new ServerTiming();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const durationKey = searchParams.get("duration");
  const collectionKey =
    (searchParams.get("collection") as MahaMantraCollectionKey | null) ?? "ALL";
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

  const { counts: collectionCounts, error: collectionCountsError } =
    await timing.measure("collection-counts", () =>
      fetchMahaMantraCollectionCounts(),
    );

  if (collectionCountsError || !collectionCounts) {
    return jsonWithServerTiming(
      { error: collectionCountsError ?? "Failed to load collection counts" },
      timing,
      { status: 500 },
    );
  }

  let query = supabase
    .from("playable_kirtans")
    .select(
      "id, audio_url, type, title, lead_singer, lead_singer_id, recorded_date, recorded_date_precision, sanga, duration_seconds, created_at, sequence_num",
    )
    .eq("type", "MM")
    .order("recorded_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (search) {
    query = query.ilike("lead_singer", `%${search}%`);
  }

  if (collectionKey === "RARE_GEMS" || collectionKey === "WITH_HARMONIUM") {
    const { ids: rareGemIds, error: rareGemIdsError } = await timing.measure(
      "collection-ids",
      () => fetchMahaMantraCollectionIds(collectionKey),
    );

    if (rareGemIdsError) {
      return jsonWithServerTiming(
        { error: rareGemIdsError },
        timing,
        { status: 500 },
      );
    }

    if (!rareGemIds || rareGemIds.length === 0) {
      return jsonWithServerTiming(
        {
          mantras: [],
          total_count: 0,
          collection_counts: collectionCounts,
          has_more: false,
          next_cursor: null,
          featured: null,
        },
        timing,
      );
    }

    query = query.in("id", rareGemIds);
  }

  const featured = await timing.measure("featured", () =>
    getDailyRareGem({ types: ["MM"] }),
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

  const {
    mantras,
    featuredKirtan,
    error: presentationError,
  } = await buildMahaMantraPresentation(page, featured.kirtan, {
    fetchTagFlags: (ids) => timing.measure("tags", () => fetchKirtanTagFlags(ids)),
    fetchLeadSingerImages: (leadSingerIds) =>
      timing.measure("lead-images", () =>
        fetchPrimaryLeadSingerImages(leadSingerIds),
      ),
  });

  if (presentationError) {
    return jsonWithServerTiming(
      { error: presentationError },
      timing,
      { status: 500 },
    );
  }

  const last = page[page.length - 1];

  return jsonWithServerTiming(
    {
      mantras,
      total_count: mantras.length,
      collection_counts: collectionCounts,
      has_more: hasMore,
      next_cursor: last
        ? { recorded_date: last.recorded_date, id: last.id }
        : null,
      featured: featuredKirtan,
    },
    timing,
  );
}
