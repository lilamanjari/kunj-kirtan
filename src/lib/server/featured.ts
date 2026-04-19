import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { KirtanType, PlayableKirtanRow } from "@/types/kirtan";

type FeaturedResult<T> = {
  kirtan: T | null;
  error: string | null;
};

function dailyIndex(length: number, salt = "") {
  const today = new Date().toISOString().slice(0, 10);
  const seedInput = `${today}-${salt}`;
  let seed = 0;
  for (let i = 0; i < seedInput.length; i += 1) {
    seed = (seed * 31 + seedInput.charCodeAt(i)) % 2147483647;
  }
  return length > 0 ? seed % length : 0;
}

type FeaturedFilters = {
  types?: KirtanType[];
  leadSingerId?: string;
  leadSingerIds?: string[];
  kirtanIds?: string[];
};

const getRareGemCandidates = unstable_cache(
  async () => {
    const { data: rareGemKirtans, error: tagError } = await supabase
      .from("kirtan_tag_slugs")
      .select("kirtan_id")
      .eq("slug", "rare-gem");

    if (tagError) {
      return { rows: null, error: tagError.message };
    }

    const rareGemIds = rareGemKirtans?.map((r) => r.kirtan_id) ?? [];
    if (rareGemIds.length === 0) {
      return { rows: [], error: null };
    }

    const { data, error } = await supabase
      .from("playable_kirtans")
      .select("*")
      .in("id", rareGemIds)
      .order("id", { ascending: true });

    if (error) {
      return { rows: null, error: error.message };
    }

    return {
      rows: data ?? [],
      error: null,
    };
  },
  ["rare-gem-candidates"],
  {
    revalidate: 86400,
    tags: ["rare-gems"],
  },
);

export async function getDailyRareGem(
  filters: FeaturedFilters = {},
): Promise<FeaturedResult<PlayableKirtanRow>> {
  const { types, leadSingerId, leadSingerIds, kirtanIds } = filters;
  const { rows, error } = await getRareGemCandidates();
  if (error) {
    return { kirtan: null, error };
  }
  if (!rows || rows.length === 0) {
    return { kirtan: null, error: null };
  }

  const allowedKirtanIds = kirtanIds ? new Set(kirtanIds) : null;
  const allowedTypes = types ? new Set(types) : null;

  const filteredRows = rows.filter((row) => {
    if (allowedTypes && !allowedTypes.has(row.type)) {
      return false;
    }
    if (leadSingerId && row.lead_singer_id !== leadSingerId) {
      return false;
    }
    if (leadSingerIds && leadSingerIds.length > 0 && !leadSingerIds.includes(row.lead_singer_id)) {
      return false;
    }
    if (allowedKirtanIds && !allowedKirtanIds.has(row.id)) {
      return false;
    }
    return true;
  });

  const salt = [
    types?.slice().sort().join(",") ?? "ALL_TYPES",
    leadSingerId ?? "ANY",
    leadSingerIds?.slice().sort().join(",") ?? "ANY_GROUP",
    kirtanIds?.slice().sort().join(",") ?? "ANY_KIRTANS",
  ].join("-");
  const index = dailyIndex(filteredRows.length, salt);
  return { kirtan: filteredRows[index] ?? null, error: null };
}
