import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
  fetchKirtanTagContext,
  fetchKirtanTagFlags,
} from "@/lib/server/kirtanTags";
import { getDailyRareGem, getDailyRareGems } from "@/lib/server/featured";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import { fetchHomeCurrentOccasion } from "@/lib/server/homeFeaturedItem";
import { fetchLeadDirectory } from "@/lib/server/leadDirectory";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";
import { OTHER_LEAD_ID } from "@/lib/leadConstants";
import type { HomeData } from "@/types/home";
import type { KirtanSummary, PlayableKirtanRow } from "@/types/kirtan";

type PopularPlayableKirtanRow = PlayableKirtanRow & {
  play_count?: number | null;
};

const HOME_RECOMMENDED_LIMIT = 6;
const HOME_RECENTLY_ADDED_LIMIT = 10;
const HOME_RECENTLY_ADDED_LOOKUP_LIMIT = 20;
const HOME_NEW_THIS_WEEK_RAIL_MINIMUM = 3;

export function getStartOfCurrentUtcWeek(date = new Date()) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start.toISOString();
}

function toKirtanSummary(
  kirtan: PlayableKirtanRow,
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
  imagesByLeadSingerId: Map<
    string,
    {
      url: string;
      alt_text: string | null;
      focus_x: number | null;
      focus_y: number | null;
      width: number | null;
      height: number | null;
    }
  >,
): KirtanSummary {
  const leadSingerImage = kirtan.lead_singer_id
    ? imagesByLeadSingerId.get(kirtan.lead_singer_id)
    : null;

  return {
    id: kirtan.id,
    audio_url: kirtan.audio_url ?? "",
    type: kirtan.type,
    title: getDisplayKirtanTitle(kirtan),
    lead_singer: kirtan.lead_singer,
    lead_singer_id: kirtan.lead_singer_id ?? null,
    lead_singer_image_url: leadSingerImage?.url ?? null,
    lead_singer_image_alt: leadSingerImage?.alt_text ?? kirtan.lead_singer,
    lead_singer_image_focus_x: leadSingerImage?.focus_x ?? null,
    lead_singer_image_focus_y: leadSingerImage?.focus_y ?? null,
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
  const featured = await getDailyRareGem({
    types: ["MM", "BHJ"],
    rotationScope: "home-rare-gems",
  });

  if (featured.error) {
    return { data: null, error: featured.error, status: 500 };
  }

  const recommended = await getDailyRareGems({
    types: ["MM", "BHJ"],
    excludeKirtanIds: featured.kirtan?.id ? [featured.kirtan.id] : [],
    rotationScope: "home-recommended-rare-gems",
    limit: HOME_RECOMMENDED_LIMIT,
  });
  if (recommended.error) {
    return { data: null, error: recommended.error, status: 500 };
  }

  const featuredKirtan: KirtanSummary | null = featured.kirtan
    ? {
        id: featured.kirtan.id,
        audio_url: featured.kirtan.audio_url ?? "",
        type: featured.kirtan.type,
        title: getDisplayKirtanTitle(featured.kirtan),
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

  const [
    { data: recentlyAdded, error: recentlyAddedError },
    { data: newThisWeek, error: newThisWeekError },
  ] = await Promise.all([
    supabase
      .from("playable_kirtans_with_titles")
      .select("*")
      .in("type", ["MM", "BHJ"])
      .order("created_at", { ascending: false })
      .order("recorded_date", { ascending: false })
      .limit(HOME_RECENTLY_ADDED_LOOKUP_LIMIT),
    supabase
      .from("playable_kirtans_with_titles")
      .select("*")
      .in("type", ["MM", "BHJ"])
      .gte("created_at", getStartOfCurrentUtcWeek())
      .order("created_at", { ascending: false })
      .order("recorded_date", { ascending: false }),
  ]);

  if (recentlyAddedError || newThisWeekError) {
    return {
      data: null,
      error: recentlyAddedError?.message ?? newThisWeekError?.message,
      status: 500,
    };
  }

  const { data: popularKirtans, error: popularError } = await supabase
    .from("playable_popular_kirtans_moving_window_with_titles")
    .select("*")
    .in("type", ["MM", "BHJ"])
    .order("play_count", { ascending: false })
    .order("last_played_at", { ascending: false })
    .limit(8);

  if (popularError) {
    return { data: null, error: popularError.message, status: 500 };
  }

  const featuredOccasion = await fetchHomeCurrentOccasion();
  if (featuredOccasion.error) {
    return { data: null, error: featuredOccasion.error, status: 500 };
  }

  const [
    mahaMantraCountResult,
    bhajanCountResult,
    occasionsCountResult,
    leadDirectoryResult,
  ] = await Promise.all([
    supabase
      .from("playable_kirtans")
      .select("id", { count: "exact", head: true })
      .eq("type", "MM"),
    supabase
      .from("playable_bhajan_titles")
      .select("browse_id", { count: "exact", head: true }),
    supabase
      .from("tags")
      .select("id", { count: "exact", head: true })
      .eq("category", "occasion")
      .eq("published", true)
      .eq("browse_visible", true),
    fetchLeadDirectory(),
  ]);

  if (mahaMantraCountResult.error) {
    return { data: null, error: mahaMantraCountResult.error.message, status: 500 };
  }

  if (bhajanCountResult.error) {
    return { data: null, error: bhajanCountResult.error.message, status: 500 };
  }

  if (occasionsCountResult.error) {
    return { data: null, error: occasionsCountResult.error.message, status: 500 };
  }

  if (leadDirectoryResult.error) {
    return { data: null, error: leadDirectoryResult.error, status: 500 };
  }

  const leadSingerCount = leadDirectoryResult.leads.filter(
    (lead) => lead.id !== OTHER_LEAD_ID,
  ).length;

  const recommendedRows = recommended.kirtans;

  const newThisWeekRows: PlayableKirtanRow[] = (newThisWeek ?? []).filter(
    (kirtan) => kirtan.id !== featured.kirtan?.id,
  );
  const shouldShowNewThisWeekRail =
    newThisWeekRows.length >= HOME_NEW_THIS_WEEK_RAIL_MINIMUM;
  const newThisWeekIds = new Set(newThisWeekRows.map((kirtan) => kirtan.id));
  const recentRows: PlayableKirtanRow[] = (recentlyAdded ?? []).filter(
    (kirtan) => !shouldShowNewThisWeekRail || !newThisWeekIds.has(kirtan.id),
  ).slice(0, HOME_RECENTLY_ADDED_LIMIT);
  const popularRows: PopularPlayableKirtanRow[] = popularKirtans ?? [];
  const recommendedIds = recommendedRows.map((k) => k.id);
  const newThisWeekKirtanIds = newThisWeekRows.map((k) => k.id);
  const recentIds = recentRows.map((k) => k.id);
  const popularIds = popularRows.map((k) => k.id);
  const featuredId = featured.kirtan?.id ?? null;
  const harmoniumLookupIds = Array.from(
    new Set(
      featuredId
        ? [
            featuredId,
            ...newThisWeekKirtanIds,
            ...recentIds,
            ...popularIds,
            ...recommendedIds,
          ]
        : [
            ...newThisWeekKirtanIds,
            ...recentIds,
            ...popularIds,
            ...recommendedIds,
          ],
    ),
  );

  const [
    { harmoniumIds, rareGemIds, error: tagError },
    { tagContextById, error: tagContextError },
  ] = await Promise.all([
    fetchKirtanTagFlags(harmoniumLookupIds),
    fetchKirtanTagContext(featuredId ? [featuredId] : []),
  ]);

  if (tagError || tagContextError) {
    return { data: null, error: tagError ?? tagContextError, status: 500 };
  }

  const leadSingerIds = Array.from(
    new Set(
      [
        featured.kirtan?.lead_singer_id,
        ...newThisWeekRows.map((k) => k.lead_singer_id),
        ...recentRows.map((k) => k.lead_singer_id),
        ...popularRows.map((k) => k.lead_singer_id),
        ...recommendedRows.map((k) => k.lead_singer_id),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const { imagesByLeadSingerId, error: imageError } =
    await fetchPrimaryLeadSingerImages(leadSingerIds);

  if (imageError) {
    return { data: null, error: imageError, status: 500 };
  }

  if (featuredId && featuredKirtan && featured.kirtan) {
    const leadSingerImage = featured.kirtan.lead_singer_id
      ? imagesByLeadSingerId.get(featured.kirtan.lead_singer_id)
      : null;
    featuredKirtan.lead_singer_id = featured.kirtan.lead_singer_id ?? null;
    featuredKirtan.lead_singer_image_url = leadSingerImage?.url ?? null;
    featuredKirtan.lead_singer_image_alt =
      leadSingerImage?.alt_text ?? featured.kirtan.lead_singer;
    featuredKirtan.lead_singer_image_focus_x = leadSingerImage?.focus_x ?? null;
    featuredKirtan.lead_singer_image_focus_y = leadSingerImage?.focus_y ?? null;
    featuredKirtan.has_harmonium = harmoniumIds.has(featuredId);
    featuredKirtan.is_rare_gem = rareGemIds.has(featuredId);
    featuredKirtan.occasion_tags =
      tagContextById.get(featuredId)?.occasionTags ?? [];
    featuredKirtan.person_tag = tagContextById.get(featuredId)?.personTag ?? null;
  }

  const recentlyAddedKirtans: KirtanSummary[] = recentRows.map((k) =>
    toKirtanSummary(
      k,
      harmoniumIds,
      rareGemIds,
      imagesByLeadSingerId,
    ),
  );
  const newThisWeekKirtans: KirtanSummary[] = newThisWeekRows.map((k) =>
    toKirtanSummary(
      k,
      harmoniumIds,
      rareGemIds,
      imagesByLeadSingerId,
    ),
  );
  const popularSummaries: KirtanSummary[] = popularRows.map((k) =>
    toKirtanSummary(
      k,
      harmoniumIds,
      rareGemIds,
      imagesByLeadSingerId,
    ),
  );
  const recommendedSummaries: KirtanSummary[] = recommendedRows.map((k) =>
    toKirtanSummary(
      k,
      harmoniumIds,
      rareGemIds,
      imagesByLeadSingerId,
    ),
  );

  const data = {
    primary_action: featuredKirtan
      ? {
          type: "rare_gem",
          kirtan: featuredKirtan,
        }
      : null,
    current_occasion: featuredOccasion.data,
    entry_points: [
      {
        id: "MM",
        label: "Maha Mantras",
        count: mahaMantraCountResult.count ?? null,
      },
      {
        id: "BHJ",
        label: "Bhajans",
        count: bhajanCountResult.count ?? null,
      },
      {
        id: "LEADS",
        label: "Lead Singers",
        count: leadSingerCount,
      },
      {
        id: "OCCASIONS",
        label: "Occasions",
        count: occasionsCountResult.count ?? null,
      },
    ],
    popular: popularSummaries.filter((k) => k.id !== featuredKirtan?.id),
    recommended: recommendedSummaries,
    new_this_week: newThisWeekKirtans,
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
