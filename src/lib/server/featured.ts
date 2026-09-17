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
  feature_slot: number;
};

type FeaturedFilters = {
  types?: KirtanType[];
  leadSingerId?: string;
  leadSingerIds?: string[];
  kirtanIds?: string[];
  rotationScope?: string;
  limit?: number;
  excludeKirtanIds?: string[];
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

export function selectRareGemCycleBatch(
  candidates: PlayableKirtanRow[],
  featuredIds: Set<string>,
  selectedTodayIds: Set<string>,
  scope: string,
  cycleNumber: number,
  limit: number,
) {
  const selected: PlayableKirtanRow[] = [];
  let activeCycleNumber = cycleNumber;
  let activeCycleIds = new Set(featuredIds);

  while (selected.length < limit) {
    const unavailableIds = new Set([
      ...activeCycleIds,
      ...selectedTodayIds,
    ]);
    let next = selectNextRareGemInCycle(
      candidates,
      unavailableIds,
      scope,
      activeCycleNumber,
    );

    if (!next) {
      activeCycleNumber += 1;
      activeCycleIds = new Set();
      next = selectNextRareGemInCycle(
        candidates,
        selectedTodayIds,
        scope,
        activeCycleNumber,
      );
    }

    // The rail should not repeat a kirtan on the same day, even when it
    // crosses a cycle boundary or there are fewer candidates than slots.
    if (!next) {
      break;
    }

    selected.push(next);
    activeCycleIds.add(next.id);
    selectedTodayIds.add(next.id);
  }

  return { selected, cycleNumber: activeCycleNumber };
}

async function getRotatingRareGems(
  candidates: PlayableKirtanRow[],
  scope: string,
  limit: number,
): Promise<{ kirtans: PlayableKirtanRow[]; error: string | null }> {
  if (limit <= 0 || candidates.length === 0) {
    return { kirtans: [], error: null };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const date = getUtcDate();
    const kirtans = [...candidates]
      .sort((left, right) => {
        const difference =
          seededSortValue(left.id, `${scope}:${date}`) -
          seededSortValue(right.id, `${scope}:${date}`);
        return difference || left.id.localeCompare(right.id);
      })
      .slice(0, limit);
    return { kirtans, error: null };
  }

  const featureDate = getUtcDate();
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("rare_gem_feature_rotations")
    .select("kirtan_id, cycle_number, feature_slot")
    .eq("feature_scope", scope)
    .eq("feature_date", featureDate)
    .order("feature_slot", { ascending: true });

  if (existingError) {
    return { kirtans: [], error: existingError.message };
  }

  const existingRows = (existing ?? []) as RareGemFeatureRotationRow[];
  const existingBySlot = new Map(
    existingRows.map((row) => [row.feature_slot, row]),
  );

  const { data: history, error: historyError } = await supabaseAdmin
    .from("rare_gem_feature_rotations")
    .select("kirtan_id, cycle_number, feature_slot")
    .eq("feature_scope", scope)
    .order("cycle_number", { ascending: false });

  if (historyError) {
    return { kirtans: [], error: historyError.message };
  }

  const rotationHistory = (history ?? []) as RareGemFeatureRotationRow[];
  let cycleNumber = rotationHistory[0]?.cycle_number ?? 1;
  let featuredIds = new Set(
    rotationHistory
      .filter((row) => row.cycle_number === cycleNumber)
      .map((row) => row.kirtan_id),
  );
  const selectedTodayIds = new Set<string>();
  const selected: PlayableKirtanRow[] = [];

  for (let featureSlot = 0; featureSlot < limit; featureSlot += 1) {
    const existingRow = existingBySlot.get(featureSlot);
    const existingKirtan = existingRow
      ? candidates.find((candidate) => candidate.id === existingRow.kirtan_id)
      : null;
    if (existingKirtan) {
      selected.push(existingKirtan);
      selectedTodayIds.add(existingKirtan.id);
      continue;
    }

    const next = selectRareGemCycleBatch(
      candidates,
      featuredIds,
      selectedTodayIds,
      scope,
      cycleNumber,
      1,
    );
    const selectedKirtan = next.selected[0];
    if (!selectedKirtan) {
      break;
    }

    const previousCycleNumber = cycleNumber;
    cycleNumber = next.cycleNumber;
    if (cycleNumber !== previousCycleNumber) {
      featuredIds = new Set();
    }
    featuredIds.add(selectedKirtan.id);

    const rotationRow = {
      feature_scope: scope,
      feature_date: featureDate,
      feature_slot: featureSlot,
      cycle_number: cycleNumber,
      kirtan_id: selectedKirtan.id,
    };
    const { error: writeError } = existingRow
      ? await supabaseAdmin
          .from("rare_gem_feature_rotations")
          .update(rotationRow)
          .eq("feature_scope", scope)
          .eq("feature_date", featureDate)
          .eq("feature_slot", featureSlot)
      : await supabaseAdmin.from("rare_gem_feature_rotations").insert(rotationRow);

    if (writeError) {
      // A simultaneous request may have reserved this slot or kirtan. Read
      // the settled daily selection instead of returning a duplicate rail.
      if (writeError.code === "23505") {
        return getRotatingRareGems(candidates, scope, limit);
      }
      return { kirtans: [], error: writeError.message };
    }

    selected.push(selectedKirtan);
  }

  return { kirtans: selected, error: null };
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
  const result = await getDailyRareGems({ ...filters, limit: 1 });
  return { kirtan: result.kirtans[0] ?? null, error: result.error };
}

export async function getDailyRareGems(
  filters: FeaturedFilters = {},
): Promise<{ kirtans: PlayableKirtanRow[]; error: string | null }> {
  const {
    types,
    leadSingerId,
    leadSingerIds,
    kirtanIds,
    rotationScope,
    limit = 1,
    excludeKirtanIds,
  } = filters;
  const { rows, error } = await getRareGemCandidates();
  if (error) {
    return { kirtans: [], error };
  }
  if (!rows || rows.length === 0) {
    return { kirtans: [], error: null };
  }

  const allowedKirtanIds = kirtanIds ? new Set(kirtanIds) : null;
  const allowedTypes = types ? new Set(types) : null;
  const excludedKirtanIds = new Set(excludeKirtanIds ?? []);

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
    if (excludedKirtanIds.has(row.id)) {
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
    return getRotatingRareGems(filteredRows, rotationScope, limit);
  }
  const index = dailyIndex(filteredRows.length, salt);
  const kirtans = Array.from({ length: Math.min(limit, filteredRows.length) }, (_, offset) =>
    filteredRows[(index + offset) % filteredRows.length],
  );
  return { kirtans, error: null };
}
