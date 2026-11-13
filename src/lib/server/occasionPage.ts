import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import {
  fetchKirtanTagContext,
  fetchKirtanTagFlags,
} from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import { compareOccasionKirtans } from "@/lib/server/occasionCurations";
import type { OccasionResponse } from "@/types/occasions";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";

type OccasionPageResult = {
  data: OccasionResponse | null;
  error: string | null;
  status: number;
};

const getCachedOccasionPageData = unstable_cache(
  async (slug: string, tag: OccasionResponse["tag"]): Promise<OccasionPageResult> => {
    const { data: tagLinks, error: linkError } = await supabase
      .from("kirtan_tag_slugs")
      .select("kirtan_id")
      .eq("slug", slug);

    if (linkError) {
      throw new Error(linkError.message);
    }

    const ids = (tagLinks ?? []).map((row) => row.kirtan_id);
    if (ids.length === 0) {
      return {
        data: {
          tag,
          featured: null,
          kirtans: [] satisfies KirtanSummary[],
        } satisfies OccasionResponse,
        error: null,
        status: 200,
      };
    }

    const featured = await getDailyRareGem({
      kirtanIds: ids,
      types: ["MM", "BHJ"],
      rotationScope: `explore-occasion-${slug}-rare-gems`,
    });
    if (featured.error) {
      throw new Error(featured.error);
    }

    const { data: kirtans, error: kirtanError } = await supabase
      .from("playable_kirtans_with_titles")
      .select("*")
      .in("id", ids)
      .in("type", ["MM", "BHJ"])
      .order("recorded_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (kirtanError) {
      throw new Error(kirtanError.message);
    }

    const kirtanIds = (kirtans ?? []).map((k) => k.id);
    if (featured.kirtan?.id) {
      kirtanIds.unshift(featured.kirtan.id);
    }
    const leadSingerIds = Array.from(
      new Set(
        [
          featured.kirtan?.lead_singer_id,
          ...(kirtans ?? []).map((k) => k.lead_singer_id),
        ].filter((value): value is string => Boolean(value)),
      ),
    );
    const [
      { harmoniumIds, rareGemIds, error: flagsError },
      { tagContextById, error: tagContextError },
    ] = await Promise.all([
      fetchKirtanTagFlags(kirtanIds),
      fetchKirtanTagContext(
        featured.kirtan?.id ? [featured.kirtan.id] : [],
      ),
    ]);
    const [
      { imagesByLeadSingerId, error: imageError },
      { data: leadSingerRows, error: priorityError },
    ] = await Promise.all([
      fetchPrimaryLeadSingerImages(leadSingerIds),
      leadSingerIds.length
        ? supabase.from("lead_singers").select("id, priority").in("id", leadSingerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (flagsError || tagContextError || imageError || priorityError) {
      throw new Error(flagsError ?? tagContextError ?? imageError ?? priorityError?.message ?? "Unknown error");
    }

    const leadSingerPriorities = new Map<string, number>(
      (leadSingerRows ?? []).map(
        (row) => [row.id, row.priority ?? 100] as [string, number],
      ),
    );

    const payload: KirtanSummary[] =
      kirtans?.map((k) => ({
        id: k.id,
        audio_url: k.audio_url ?? "",
        type: k.type as KirtanType,
        title: getDisplayKirtanTitle(k),
        lead_singer: k.lead_singer,
        lead_singer_id: k.lead_singer_id ?? null,
        lead_singer_image_url: k.lead_singer_id
          ? imagesByLeadSingerId.get(k.lead_singer_id)?.url ?? null
          : null,
        lead_singer_image_alt: k.lead_singer_id
          ? imagesByLeadSingerId.get(k.lead_singer_id)?.alt_text ?? k.lead_singer
          : k.lead_singer,
        lead_singer_image_focus_x: k.lead_singer_id
          ? imagesByLeadSingerId.get(k.lead_singer_id)?.focus_x ?? null
          : null,
        lead_singer_image_focus_y: k.lead_singer_id
          ? imagesByLeadSingerId.get(k.lead_singer_id)?.focus_y ?? null
          : null,
        recorded_date: k.recorded_date,
        recorded_date_precision: k.recorded_date_precision ?? null,
        sanga: k.sanga,
        duration_seconds: k.duration_seconds,
        sequence_num: k.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(k.id),
        is_rare_gem: rareGemIds.has(k.id),
      })).sort((left, right) =>
        compareOccasionKirtans(left, right, leadSingerPriorities),
      ) ?? [];

    const featuredKirtan: KirtanSummary | null = featured.kirtan
      ? {
          id: featured.kirtan.id,
          audio_url: featured.kirtan.audio_url ?? "",
          type: featured.kirtan.type as KirtanType,
          title: getDisplayKirtanTitle(featured.kirtan),
          lead_singer: featured.kirtan.lead_singer,
          lead_singer_id: featured.kirtan.lead_singer_id ?? null,
          lead_singer_image_url: featured.kirtan.lead_singer_id
            ? imagesByLeadSingerId.get(featured.kirtan.lead_singer_id)?.url ?? null
            : null,
          lead_singer_image_alt: featured.kirtan.lead_singer_id
            ? imagesByLeadSingerId.get(featured.kirtan.lead_singer_id)?.alt_text ??
              featured.kirtan.lead_singer
            : featured.kirtan.lead_singer,
          lead_singer_image_focus_x: featured.kirtan.lead_singer_id
            ? imagesByLeadSingerId.get(featured.kirtan.lead_singer_id)?.focus_x ?? null
            : null,
          lead_singer_image_focus_y: featured.kirtan.lead_singer_id
            ? imagesByLeadSingerId.get(featured.kirtan.lead_singer_id)?.focus_y ?? null
            : null,
          recorded_date: featured.kirtan.recorded_date,
          recorded_date_precision:
            featured.kirtan.recorded_date_precision ?? null,
          sanga: featured.kirtan.sanga,
          duration_seconds: featured.kirtan.duration_seconds,
          sequence_num: featured.kirtan.sequence_num ?? null,
          has_harmonium: harmoniumIds.has(featured.kirtan.id),
          is_rare_gem: rareGemIds.has(featured.kirtan.id),
          occasion_tags:
            tagContextById.get(featured.kirtan.id)?.occasionTags ?? [],
          person_tag:
            tagContextById.get(featured.kirtan.id)?.personTag ?? null,
        }
      : null;

    return {
      data: {
        tag,
        featured: featuredKirtan,
        kirtans: payload,
      } satisfies OccasionResponse,
      error: null,
      status: 200,
    };
  },
  ["occasion-page-data"],
  {
    revalidate: 86400,
    tags: ["explore-occasion-slugs", "rare-gems"],
  },
);

export async function getOccasionPageData(slug: string) {
  // Check existence outside unstable_cache so a missing tag or a temporary
  // Supabase error can never become a cached page result.
  const { data: tag, error } = await supabase
    .from("tags")
    .select("id, name, slug, description")
    .eq("slug", slug)
    .eq("category", "occasion")
    .eq("published", true)
    .maybeSingle();

  if (error) return { data: null, error: error.message, status: 500 };
  if (!tag) return { data: null, error: "Occasion not found", status: 404 };

  try {
    return await getCachedOccasionPageData(slug, tag);
  } catch (cause) {
    return {
      data: null,
      error: cause instanceof Error ? cause.message : "Failed to load occasion page",
      status: 500,
    };
  }
}
