import { supabase } from "@/lib/supabase";

export type MahaMantraCollectionKey =
  | "ALL"
  | "RARE_GEMS"
  | "WITH_HARMONIUM";

export type MahaMantraCollectionCounts = {
  rare_gems: number;
  with_harmonium: number;
};

async function fetchTagIds(slug: "rare-gem" | "harmonium") {
  const { data, error } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id")
    .eq("slug", slug);

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

export async function fetchMahaMantraCollectionCounts() {
  const { ids: rareGemIds, error: rareGemIdsError } = await fetchTagIds(
    "rare-gem",
  );
  if (rareGemIdsError) {
    return {
      counts: null as MahaMantraCollectionCounts | null,
      error: rareGemIdsError,
    };
  }

  const { ids: harmoniumIds, error: harmoniumIdsError } = await fetchTagIds(
    "harmonium",
  );
  if (harmoniumIdsError) {
    return {
      counts: null as MahaMantraCollectionCounts | null,
      error: harmoniumIdsError,
    };
  }

  let rareGemCount = 0;
  if (rareGemIds.length > 0) {
    const { count, error } = await supabase
      .from("playable_kirtans")
      .select("id", { count: "exact", head: true })
      .eq("type", "MM")
      .in("id", rareGemIds);

    if (error) {
      return {
        counts: null as MahaMantraCollectionCounts | null,
        error: error.message,
      };
    }

    rareGemCount = count ?? 0;
  }

  let harmoniumCount = 0;
  if (harmoniumIds.length > 0) {
    const { count, error } = await supabase
      .from("playable_kirtans")
      .select("id", { count: "exact", head: true })
      .eq("type", "MM")
      .in("id", harmoniumIds);

    if (error) {
      return {
        counts: null as MahaMantraCollectionCounts | null,
        error: error.message,
      };
    }

    harmoniumCount = count ?? 0;
  }

  return {
    counts: {
      rare_gems: rareGemCount,
      with_harmonium: harmoniumCount,
    },
    error: null,
  };
}

export async function fetchMahaMantraCollectionIds(
  collection: MahaMantraCollectionKey,
) {
  if (collection === "RARE_GEMS") {
    return fetchTagIds("rare-gem");
  }

  if (collection === "WITH_HARMONIUM") {
    return fetchTagIds("harmonium");
  }

  return { ids: null as string[] | null, error: null };
}
