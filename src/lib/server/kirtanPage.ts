import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getHomePageData } from "@/lib/server/homePage";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import type { KirtanSummary, PlayableKirtanRow } from "@/types/kirtan";

export type PublicKirtanPageData = {
  kirtan: KirtanSummary;
  moreByLeadSinger: KirtanSummary[];
  featuredKirtans: KirtanSummary[];
  popularKirtans: KirtanSummary[];
};

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

async function buildPublicKirtanPageData(id: string) {
  const { data: currentKirtan, error: currentError } = await supabase
    .from("playable_kirtans_with_titles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    return { data: null, error: currentError.message, status: 500 };
  }

  if (!currentKirtan) {
    return { data: null, error: "Kirtan not found", status: 404 };
  }

  const homeResult = await getHomePageData();
  if (homeResult.error || !homeResult.data) {
    return { data: null, error: homeResult.error ?? "Failed to load home page data", status: 500 };
  }

  const { data: leadRows, error: leadError } = currentKirtan.lead_singer_id
    ? await supabase
        .from("playable_kirtans_with_titles")
        .select("*")
        .eq("lead_singer_id", currentKirtan.lead_singer_id)
        .neq("id", id)
        .order("recorded_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [], error: null };

  if (leadError) {
    return { data: null, error: leadError.message, status: 500 };
  }

  const relatedRows = ((leadRows ?? []) as PlayableKirtanRow[]).filter(
    (row) => row.audio_url,
  );

  const leadSingerIds = Array.from(
    new Set(
      [
        currentKirtan.lead_singer_id,
        ...relatedRows.map((row) => row.lead_singer_id),
        ...homeResult.data.recommended.map((row) => row.lead_singer_id),
        ...homeResult.data.popular.map((row) => row.lead_singer_id),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const kirtanIds = Array.from(
    new Set([
      id,
      ...relatedRows.map((row) => row.id),
      ...homeResult.data.recommended.map((row) => row.id),
      ...homeResult.data.popular.map((row) => row.id),
    ]),
  );

  const [
    { harmoniumIds, rareGemIds, error: tagError },
    { imagesByLeadSingerId, error: imageError },
  ] = await Promise.all([
    fetchKirtanTagFlags(kirtanIds),
    fetchPrimaryLeadSingerImages(leadSingerIds),
  ]);

  if (tagError || imageError) {
    return { data: null, error: tagError ?? imageError ?? "Unknown error", status: 500 };
  }

  const currentSummary = toKirtanSummary(
    currentKirtan as PlayableKirtanRow,
    harmoniumIds,
    rareGemIds,
    imagesByLeadSingerId,
  );

  const data = {
    kirtan: currentSummary,
    moreByLeadSinger: relatedRows.map((row) =>
      toKirtanSummary(row, harmoniumIds, rareGemIds, imagesByLeadSingerId),
    ),
    featuredKirtans: homeResult.data.recommended.filter((row) => row.id !== id),
    popularKirtans: homeResult.data.popular.filter((row) => row.id !== id),
  } satisfies PublicKirtanPageData;

  return { data, error: null, status: 200 };
}

const getCachedPublicKirtanPageData = unstable_cache(
  async (id: string) => buildPublicKirtanPageData(id),
  ["public-kirtan-page-data"],
  {
    revalidate: 86400,
    tags: ["home", "rare-gems", "explore-leads", "kirtan-page"],
  },
);

export async function getPublicKirtanPageData(id: string) {
  if (process.env.NODE_ENV === "test") {
    return buildPublicKirtanPageData(id);
  }

  return getCachedPublicKirtanPageData(id);
}
