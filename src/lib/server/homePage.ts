import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
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

const HOME_RECOMMENDED_LIMIT = 8;

function toKirtanSummary(
  kirtan: PlayableKirtanRow,
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
  imagesByLeadSingerId: Map<
    string,
    { url: string; alt_text: string | null; width: number | null; height: number | null }
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
    recorded_date: kirtan.recorded_date,
    recorded_date_precision: kirtan.recorded_date_precision ?? null,
    sanga: kirtan.sanga,
    duration_seconds: kirtan.duration_seconds,
    sequence_num: kirtan.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(kirtan.id),
    is_rare_gem: rareGemIds.has(kirtan.id),
  };
}

function getIsoWeekInfo(date = new Date()) {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

  const weekYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNumber = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return {
    key: `${weekYear}-W${String(weekNumber).padStart(2, "0")}`,
    sequence: weekYear * 100 + weekNumber,
  };
}

function getSeededSortValue(value: string, seed: string) {
  const input = `${seed}:${value}`;
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 2147483647;
  }

  return hash;
}

function getLeadSingerBucket(kirtan: PlayableKirtanRow) {
  if (kirtan.lead_singer_id) {
    return `id:${kirtan.lead_singer_id}`;
  }

  if (kirtan.lead_singer) {
    return `name:${kirtan.lead_singer.trim().toLowerCase()}`;
  }

  return `unknown:${kirtan.id}`;
}

export function selectWeeklyRecommendedRareGems(
  candidates: PlayableKirtanRow[],
  limit = HOME_RECOMMENDED_LIMIT,
  date = new Date(),
) {
  if (limit <= 0 || candidates.length === 0) {
    return [];
  }

  const week = getIsoWeekInfo(date);
  const groupedByLeadSinger = new Map<string, PlayableKirtanRow[]>();
  const orderedGroupKeys = Array.from(
    new Set(candidates.map((candidate) => getLeadSingerBucket(candidate))),
  ).sort((left, right) => left.localeCompare(right));

  for (const candidate of candidates) {
    const bucket = getLeadSingerBucket(candidate);
    if (!groupedByLeadSinger.has(bucket)) {
      groupedByLeadSinger.set(bucket, []);
    }
    groupedByLeadSinger.get(bucket)?.push(candidate);
  }

  for (const groupKey of orderedGroupKeys) {
    groupedByLeadSinger.get(groupKey)?.sort((left, right) => {
      const scoreDiff =
        getSeededSortValue(left.id, week.key) -
        getSeededSortValue(right.id, week.key);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return left.id.localeCompare(right.id);
    });
  }

  const rotationOffset =
    orderedGroupKeys.length > 0 ? week.sequence % orderedGroupKeys.length : 0;
  const rotatedGroupKeys = orderedGroupKeys.map(
    (_, index) =>
      orderedGroupKeys[(index + rotationOffset) % orderedGroupKeys.length],
  );

  const selected: PlayableKirtanRow[] = [];

  while (selected.length < limit) {
    let addedThisRound = false;

    for (const groupKey of rotatedGroupKeys) {
      const group = groupedByLeadSinger.get(groupKey);
      const nextCandidate = group?.shift();

      if (!nextCandidate) {
        continue;
      }

      selected.push(nextCandidate);
      addedThisRound = true;

      if (selected.length >= limit) {
        break;
      }
    }

    if (!addedThisRound) {
      break;
    }
  }

  return selected;
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
        title: featured.kirtan.title,
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
    .from("playable_kirtans_with_titles")
    .select("*")
    .in("type", ["MM", "BHJ"])
    .order("created_at", { ascending: false })
    .order("recorded_date", { ascending: false })
    .limit(10);

  if (recentlyAddedError) {
    return { data: null, error: recentlyAddedError.message, status: 500 };
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

  const { data: rareGemTags, error: rareGemTagsError } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id")
    .eq("slug", "rare-gem");

  if (rareGemTagsError) {
    return { data: null, error: rareGemTagsError.message, status: 500 };
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

  const rareGemCandidateIds =
    rareGemTags?.map((row) => row.kirtan_id).filter(Boolean) ?? [];
  let recommendedRows: PlayableKirtanRow[] = [];

  if (rareGemCandidateIds.length > 0) {
    const { data: recommendedCandidates, error: recommendedError } =
      await supabase
        .from("playable_kirtans_with_titles")
        .select("*")
        .in("id", rareGemCandidateIds)
        .in("type", ["MM", "BHJ"])
        .order("id", { ascending: true });

    if (recommendedError) {
      return { data: null, error: recommendedError.message, status: 500 };
    }

    recommendedRows = selectWeeklyRecommendedRareGems(
      (recommendedCandidates ?? []).filter(
        (candidate) => candidate.id !== featured.kirtan?.id,
      ),
    );
  }

  const recentRows: PlayableKirtanRow[] = recentlyAdded ?? [];
  const popularRows: PopularPlayableKirtanRow[] = popularKirtans ?? [];
  const recommendedIds = recommendedRows.map((k) => k.id);
  const recentIds = recentRows.map((k) => k.id);
  const popularIds = popularRows.map((k) => k.id);
  const featuredId = featured.kirtan?.id ?? null;
  const harmoniumLookupIds = Array.from(
    new Set(
      featuredId
        ? [featuredId, ...recentIds, ...popularIds, ...recommendedIds]
        : [...recentIds, ...popularIds, ...recommendedIds],
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

  const leadSingerIds = Array.from(
    new Set(
      [
        featured.kirtan?.lead_singer_id,
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
    featuredKirtan.title = getDisplayKirtanTitle(featured.kirtan);
    featuredKirtan.lead_singer_id = featured.kirtan.lead_singer_id ?? null;
    featuredKirtan.lead_singer_image_url = leadSingerImage?.url ?? null;
    featuredKirtan.lead_singer_image_alt =
      leadSingerImage?.alt_text ?? featured.kirtan.lead_singer;
    featuredKirtan.has_harmonium = harmoniumIds.has(featuredId);
    featuredKirtan.is_rare_gem = rareGemIds.has(featuredId);
  }

  const recentlyAddedKirtans: KirtanSummary[] = recentRows.map((k) =>
    toKirtanSummary(k, harmoniumIds, rareGemIds, imagesByLeadSingerId),
  );
  const popularSummaries: KirtanSummary[] = popularRows.map((k) =>
    toKirtanSummary(k, harmoniumIds, rareGemIds, imagesByLeadSingerId),
  );
  const recommendedSummaries: KirtanSummary[] = recommendedRows.map((k) =>
    toKirtanSummary(k, harmoniumIds, rareGemIds, imagesByLeadSingerId),
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
