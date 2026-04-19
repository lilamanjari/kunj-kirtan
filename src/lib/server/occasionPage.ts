import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import { fetchKirtanPersonNames, fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { getDailyRareGem } from "@/lib/server/featured";
import type { OccasionPersonGroup, OccasionResponse } from "@/types/occasions";

const getCachedOccasionPageData = unstable_cache(
  async (slug: string) => {
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("category", "occasion")
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

    const featured = await getDailyRareGem({ kirtanIds: ids });
    if (featured.error) {
      return { data: null, error: featured.error, status: 500 };
    }

    const { data: kirtans, error: kirtanError } = await supabase
      .from("playable_kirtans")
      .select("*")
      .in("id", ids)
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
    const { harmoniumIds, rareGemIds, error: flagsError } =
      await fetchKirtanTagFlags(kirtanIds);

    if (flagsError) {
      return { data: null, error: flagsError, status: 500 };
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
        title: formatKirtanTitle(k.type as KirtanType, k.title),
        lead_singer: k.lead_singer,
        recorded_date: k.recorded_date,
        recorded_date_precision: k.recorded_date_precision ?? null,
        sanga: k.sanga,
        duration_seconds: k.duration_seconds,
        sequence_num: k.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(k.id),
        is_rare_gem: rareGemIds.has(k.id),
        person_tag: personNamesById.get(k.id) ?? null,
      })) ?? [];

    const featuredKirtan: KirtanSummary | null = featured.kirtan
      ? {
          id: featured.kirtan.id,
          audio_url: featured.kirtan.audio_url ?? "",
          type: featured.kirtan.type as KirtanType,
          title: formatKirtanTitle(
            featured.kirtan.type as KirtanType,
            featured.kirtan.title,
          ),
          lead_singer: featured.kirtan.lead_singer,
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

    const personGroupsMap = new Map<string, KirtanSummary[]>();
    const ungroupedKirtans: KirtanSummary[] = [];

    for (const kirtan of payload) {
      if (!kirtan.person_tag) {
        ungroupedKirtans.push(kirtan);
        continue;
      }
      const existing = personGroupsMap.get(kirtan.person_tag);
      if (existing) {
        existing.push(kirtan);
      } else {
        personGroupsMap.set(kirtan.person_tag, [kirtan]);
      }
    }

    const personGroups: OccasionPersonGroup[] = Array.from(
      personGroupsMap.entries(),
      ([person_name, kirtans]) => ({
        person_name,
        kirtans,
      }),
    );

    return {
      data: {
        tag,
        featured: featuredKirtan,
        kirtans: payload,
        person_groups: personGroups,
        ungrouped_kirtans: ungroupedKirtans,
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
