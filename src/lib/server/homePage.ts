import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { HomeData } from "@/types/home";
import type { KirtanSummary, PlayableKirtanRow } from "@/types/kirtan";

type PopularPlayableKirtanRow = PlayableKirtanRow & {
  play_count?: number | null;
};

function toKirtanSummary(
  kirtan: PlayableKirtanRow,
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
): KirtanSummary {
  return {
    id: kirtan.id,
    audio_url: kirtan.audio_url ?? "",
    type: kirtan.type,
    title: formatKirtanTitle(kirtan.type, kirtan.title),
    lead_singer: kirtan.lead_singer,
    recorded_date: kirtan.recorded_date,
    recorded_date_precision: kirtan.recorded_date_precision ?? null,
    sanga: kirtan.sanga,
    duration_seconds: kirtan.duration_seconds,
    sequence_num: kirtan.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(kirtan.id),
    is_rare_gem: rareGemIds.has(kirtan.id),
  };
}

async function buildHomePageData() {
  const featured = await getDailyRareGem({ types: ["MM", "BHJ"] });

  if (featured.error) {
    return { data: null, error: featured.error, status: 500 };
  }

  const featuredKirtan: KirtanSummary | null = featured.kirtan
    ? {
        id: featured.kirtan.id,
        audio_url: featured.kirtan.audio_url ?? "",
        type: featured.kirtan.type,
        title: formatKirtanTitle(featured.kirtan.type, featured.kirtan.title),
        lead_singer: featured.kirtan.lead_singer,
        recorded_date: featured.kirtan.recorded_date,
        recorded_date_precision:
          featured.kirtan.recorded_date_precision ?? null,
        sanga: featured.kirtan.sanga,
        duration_seconds: featured.kirtan.duration_seconds,
        sequence_num: featured.kirtan.sequence_num ?? null,
        has_harmonium: false,
        is_rare_gem: true,
      }
    : null;

  const { data: recentlyAdded, error: recentlyAddedError } = await supabase
    .from("playable_kirtans")
    .select("*")
    .in("type", ["MM", "BHJ"])
    .order("created_at", { ascending: false })
    .order("recorded_date", { ascending: false })
    .limit(10);

  if (recentlyAddedError) {
    return { data: null, error: recentlyAddedError.message, status: 500 };
  }

  const { data: popularKirtans, error: popularError } = await supabase
    .from("playable_popular_kirtans_moving_window")
    .select("*")
    .in("type", ["MM", "BHJ"])
    .order("play_count", { ascending: false })
    .order("last_played_at", { ascending: false })
    .limit(8);

  if (popularError) {
    return { data: null, error: popularError.message, status: 500 };
  }

  const recentRows: PlayableKirtanRow[] = recentlyAdded ?? [];
  const popularRows: PopularPlayableKirtanRow[] = popularKirtans ?? [];
  const recentIds = recentRows.map((k) => k.id);
  const popularIds = popularRows.map((k) => k.id);
  const featuredId = featured.kirtan?.id ?? null;
  const harmoniumLookupIds = Array.from(
    new Set(
      featuredId
        ? [featuredId, ...recentIds, ...popularIds]
        : [...recentIds, ...popularIds],
    ),
  );

  const {
    harmoniumIds,
    rareGemIds,
    error: tagError,
  } = await fetchKirtanTagFlags(harmoniumLookupIds);

  if (tagError) {
    return { data: null, error: tagError, status: 500 };
  }

  if (featuredId && featuredKirtan) {
    featuredKirtan.has_harmonium = harmoniumIds.has(featuredId);
    featuredKirtan.is_rare_gem = rareGemIds.has(featuredId);
  }

  const recentlyAddedKirtans: KirtanSummary[] = recentRows.map((k) =>
    toKirtanSummary(k, harmoniumIds, rareGemIds),
  );
  const popularSummaries: KirtanSummary[] = popularRows.map((k) =>
    toKirtanSummary(k, harmoniumIds, rareGemIds),
  );

  const data = {
    primary_action: featuredKirtan
      ? {
          type: "rare_gem",
          kirtan: featuredKirtan,
        }
      : null,
    continue_listening: null,
    entry_points: [
      { id: "MM", label: "Maha Mantras" },
      { id: "BHJ", label: "Bhajans" },
      { id: "LEADS", label: "Lead Singers" },
      { id: "OCCASIONS", label: "Occasions" },
    ],
    popular: popularSummaries.filter((k) => k.id !== featuredKirtan?.id),
    recently_added: recentlyAddedKirtans.filter(
      (k) => k.id !== featuredKirtan?.id,
    ),
  } satisfies HomeData;

  return { data, error: null, status: 200 };
}

const getCachedHomePageData = unstable_cache(
  async () => buildHomePageData(),
  ["home-page-data"],
  {
    revalidate: 86400,
    tags: ["home", "rare-gems"],
  },
);

export async function getHomePageData() {
  if (process.env.NODE_ENV === "test") {
    return buildHomePageData();
  }

  return getCachedHomePageData();
}
