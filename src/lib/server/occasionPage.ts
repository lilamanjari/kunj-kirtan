import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import { fetchKirtanPersonNames, fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import { compareOccasionKirtans } from "@/lib/server/occasionCurations";
import type { OccasionResponse } from "@/types/occasions";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";

const getCachedOccasionPageData = unstable_cache(
  async (slug: string) => {
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("category", "occasion")
      .eq("published", true)
      .maybeSingle();

    if (tagError || !tag) {
      return { data: null, error: "Occasion not found", status: 404 };
    }

    const { data: tagLinks, error: linkError } = await supabase
      .from("kirtan_tag_slugs")
      .select("kirtan_id")
      .eq("slug", slug);

    if (linkError) {
      return { data: null, error: linkError.message, status: 500 };
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
    });
    if (featured.error) {
      return { data: null, error: featured.error, status: 500 };
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
      return { data: null, error: kirtanError.message, status: 500 };
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
    const { harmoniumIds, rareGemIds, error: flagsError } =
      await fetchKirtanTagFlags(kirtanIds);
    const { imagesByLeadSingerId, error: imageError } =
      await fetchPrimaryLeadSingerImages(leadSingerIds);

    if (flagsError || imageError) {
      return { data: null, error: flagsError ?? imageError ?? "Unknown error", status: 500 };
    }

    const { personNamesById, error: personError } =
      await fetchKirtanPersonNames(kirtanIds);

    if (personError) {
      return { data: null, error: personError, status: 500 };
    }

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
        recorded_date: k.recorded_date,
        recorded_date_precision: k.recorded_date_precision ?? null,
        sanga: k.sanga,
        duration_seconds: k.duration_seconds,
        sequence_num: k.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(k.id),
        is_rare_gem: rareGemIds.has(k.id),
        person_tag: personNamesById.get(k.id) ?? null,
      })).sort(compareOccasionKirtans) ?? [];

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
          recorded_date: featured.kirtan.recorded_date,
          recorded_date_precision:
            featured.kirtan.recorded_date_precision ?? null,
          sanga: featured.kirtan.sanga,
          duration_seconds: featured.kirtan.duration_seconds,
          sequence_num: featured.kirtan.sequence_num ?? null,
          has_harmonium: harmoniumIds.has(featured.kirtan.id),
          is_rare_gem: rareGemIds.has(featured.kirtan.id),
          person_tag: personNamesById.get(featured.kirtan.id) ?? null,
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
  return getCachedOccasionPageData(slug);
}
