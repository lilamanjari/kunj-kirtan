import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { HomeData } from "@/types/home";
import type { KirtanSummary, PlayableKirtanRow } from "@/types/kirtan";

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
          title: formatKirtanTitle(
            featured.kirtan.type,
            featured.kirtan.title,
          ),
          lead_singer: featured.kirtan.lead_singer,
          recorded_date: featured.kirtan.recorded_date,
          recorded_date_precision: featured.kirtan.recorded_date_precision ?? null,
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

    const recentRows: PlayableKirtanRow[] = recentlyAdded ?? [];
    const recentIds = recentRows.map((k) => k.id);
    const featuredId = featured.kirtan?.id ?? null;
    const harmoniumLookupIds = featuredId ? [featuredId, ...recentIds] : recentIds;

    const { harmoniumIds, rareGemIds, error: tagError } =
      await fetchKirtanTagFlags(harmoniumLookupIds);

    if (tagError) {
      return { data: null, error: tagError, status: 500 };
    }

    if (featuredId && featuredKirtan) {
      featuredKirtan.has_harmonium = harmoniumIds.has(featuredId);
      featuredKirtan.is_rare_gem = rareGemIds.has(featuredId);
    }

    const recentlyAddedKirtans: KirtanSummary[] =
      recentRows.map((k) => ({
        id: k.id,
        audio_url: k.audio_url ?? "",
        type: k.type,
        title: formatKirtanTitle(k.type, k.title),
        lead_singer: k.lead_singer,
        recorded_date: k.recorded_date,
        recorded_date_precision: k.recorded_date_precision ?? null,
        sanga: k.sanga,
        duration_seconds: k.duration_seconds,
        sequence_num: k.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(k.id),
        is_rare_gem: rareGemIds.has(k.id),
      }));

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
