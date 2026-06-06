import { supabase } from "@/lib/supabase";

const HISTORICAL_TREASURE_LEAD_SINGER_ID =
  "efe26ff7-eb11-4227-b20c-cb573cb5e140";

export type BhajanCollectionKey = "ALL" | "HISTORICAL_TREASURES" | "RARE_GEMS";

export type BhajanCollectionCounts = {
  historical_treasures: number;
  rare_gems: number;
};

async function fetchRareGemKirtanIds() {
  const { data, error } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id")
    .eq("slug", "rare-gem");

  if (error) {
    return { ids: [] as string[], error: error.message };
  }

  return {
    ids: Array.from(
      new Set((data ?? []).map((row) => row.kirtan_id).filter(Boolean)),
    ),
    error: null,
  };
}

async function fetchHistoricalTreasureKirtanIds() {
  const { data, error } = await supabase
    .from("playable_kirtans")
    .select("id")
    .eq("type", "BHJ")
    .or(
      `recorded_date.lte.2010-12-31,lead_singer_id.eq.${HISTORICAL_TREASURE_LEAD_SINGER_ID}`,
    );

  if (error) {
    return { ids: [] as string[], error: error.message };
  }

  return {
    ids: Array.from(new Set((data ?? []).map((row) => row.id).filter(Boolean))),
    error: null,
  };
}

async function countBhajanRowsForKirtanIds(ids: string[]) {
  if (ids.length === 0) {
    return { count: 0, error: null };
  }

  const { count, error } = await supabase
    .from("playable_bhajan_titles")
    .select("browse_id", { count: "exact", head: true })
    .in("kirtan_id", ids);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export async function fetchBhajanCollectionCounts() {
  const { ids: historicalIds, error: historicalError } =
    await fetchHistoricalTreasureKirtanIds();
  if (historicalError) {
    return {
      counts: null as BhajanCollectionCounts | null,
      error: historicalError,
    };
  }

  const { ids: rareGemIds, error: rareGemError } = await fetchRareGemKirtanIds();
  if (rareGemError) {
    return {
      counts: null as BhajanCollectionCounts | null,
      error: rareGemError,
    };
  }

  const { count: historicalCount, error: historicalCountError } =
    await countBhajanRowsForKirtanIds(historicalIds);
  if (historicalCountError) {
    return {
      counts: null as BhajanCollectionCounts | null,
      error: historicalCountError,
    };
  }

  const { count: rareGemCount, error: rareGemCountError } =
    await countBhajanRowsForKirtanIds(rareGemIds);
  if (rareGemCountError) {
    return {
      counts: null as BhajanCollectionCounts | null,
      error: rareGemCountError,
    };
  }

  return {
    counts: {
      historical_treasures: historicalCount,
      rare_gems: rareGemCount,
    },
    error: null,
  };
}

export async function fetchBhajanCollectionKirtanIds(
  collection: BhajanCollectionKey,
) {
  if (collection === "HISTORICAL_TREASURES") {
    return fetchHistoricalTreasureKirtanIds();
  }

  if (collection === "RARE_GEMS") {
    return fetchRareGemKirtanIds();
  }

  return { ids: null as string[] | null, error: null };
}
