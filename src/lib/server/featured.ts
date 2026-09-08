import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
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

function seededSortValue(value: string, seed: string) {
  let hash = 0;
  const input = `${seed}:${value}`;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 2147483647;
  }
  return hash;
}

function getUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

type RareGemFeatureRotationRow = {
  kirtan_id: string;
  cycle_number: number;
};

type FeaturedFilters = {
  types?: KirtanType[];
  leadSingerId?: string;
  leadSingerIds?: string[];
  kirtanIds?: string[];
  rotationScope?: string;
};

export function selectNextRareGemInCycle(
  candidates: PlayableKirtanRow[],
  featuredIds: Set<string>,
  scope: string,
  cycleNumber: number,
) {
  return candidates
    .filter((candidate) => !featuredIds.has(candidate.id))
    .sort((left, right) => {
      const sortDifference =
        seededSortValue(left.id, `${scope}:${cycleNumber}`) -
        seededSortValue(right.id, `${scope}:${cycleNumber}`);
      return sortDifference || left.id.localeCompare(right.id);
    })[0] ?? null;
}

async function getRotatingRareGem(
  candidates: PlayableKirtanRow[],
  scope: string,
): Promise<FeaturedResult<PlayableKirtanRow>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const index = dailyIndex(candidates.length, scope);
    return { kirtan: candidates[index] ?? null, error: null };
  }

  const featureDate = getUtcDate();
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("rare_gem_feature_rotations")
    .select("kirtan_id, cycle_number")
    .eq("feature_scope", scope)
    .eq("feature_date", featureDate)
    .maybeSingle();

  if (existingError) {
    return { kirtan: null, error: existingError.message };
  }

  if (existing) {
    const selected = candidates.find((candidate) => candidate.id === existing.kirtan_id);
    if (selected) {
      return { kirtan: selected, error: null };
    }
  }

  const { data: history, error: historyError } = await supabaseAdmin
    .from("rare_gem_feature_rotations")
    .select("kirtan_id, cycle_number")
    .eq("feature_scope", scope)
    .order("cycle_number", { ascending: false });

  if (historyError) {
    return { kirtan: null, error: historyError.message };
  }

  const rotationHistory = (history ?? []) as RareGemFeatureRotationRow[];
  let cycleNumber = rotationHistory[0]?.cycle_number ?? 1;
  let featuredIds = new Set(
    rotationHistory
      .filter((row) => row.cycle_number === cycleNumber)
      .map((row) => row.kirtan_id),
  );
  let selected = selectNextRareGemInCycle(
    candidates,
    featuredIds,
    scope,
    cycleNumber,
  );

  if (!selected) {
    cycleNumber += 1;
    featuredIds = new Set();
    selected = selectNextRareGemInCycle(
      candidates,
      featuredIds,
      scope,
      cycleNumber,
    );
  }

  if (!selected) {
    return { kirtan: null, error: null };
  }

  const rotationRow = {
    feature_scope: scope,
    feature_date: featureDate,
    cycle_number: cycleNumber,
    kirtan_id: selected.id,
  };
  const { error: insertError } = existing
    ? await supabaseAdmin
        .from("rare_gem_feature_rotations")
        .update(rotationRow)
        .eq("feature_scope", scope)
        .eq("feature_date", featureDate)
    : await supabaseAdmin.from("rare_gem_feature_rotations").insert(rotationRow);

  if (!insertError) {
    return { kirtan: selected, error: null };
  }

  if (insertError.code === "23505") {
    const { data: concurrentSelection, error: concurrentError } =
      await supabaseAdmin
        .from("rare_gem_feature_rotations")
        .select("kirtan_id")
        .eq("feature_scope", scope)
        .eq("feature_date", featureDate)
        .maybeSingle();
    if (concurrentError) {
      return { kirtan: null, error: concurrentError.message };
    }
    const concurrentKirtan = candidates.find(
      (candidate) => candidate.id === concurrentSelection?.kirtan_id,
    );
    if (concurrentKirtan) {
      return { kirtan: concurrentKirtan, error: null };
    }
  }

  return { kirtan: null, error: insertError.message };
}

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
      .from("playable_kirtans_with_titles")
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
  const { types, leadSingerId, leadSingerIds, kirtanIds, rotationScope } =
    filters;
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
  if (rotationScope) {
    return getRotatingRareGem(filteredRows, rotationScope);
  }
  const index = dailyIndex(filteredRows.length, salt);
  return { kirtan: filteredRows[index] ?? null, error: null };
}
