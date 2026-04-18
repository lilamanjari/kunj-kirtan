import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { KirtanType } from "@/types/kirtan";

export const revalidate = 86400;

export async function GET() {
  const timing = new ServerTiming();
  /* 1. Rare gem */

  const { kirtan: featuredKirtanData, error: featuredError } =
    await timing.measure("featured", () => getDailyRareGem());

  if (featuredError) {
    return jsonWithServerTiming({ error: featuredError }, timing, {
      status: 500,
    });
  }

  const featuredKirtan: KirtanSummary | null = featuredKirtanData
    ? {
        id: featuredKirtanData?.id,
        audio_url: featuredKirtanData?.audio_url ?? "",
        type: featuredKirtanData?.type as KirtanType,
        title: formatKirtanTitle(
          featuredKirtanData?.type as KirtanType,
          featuredKirtanData?.title,
        ),
        lead_singer: featuredKirtanData?.lead_singer,
        recorded_date: featuredKirtanData?.recorded_date,
        recorded_date_precision:
          featuredKirtanData?.recorded_date_precision ?? null,
        sanga: featuredKirtanData?.sanga,
        duration_seconds: featuredKirtanData?.duration_seconds,
        sequence_num: featuredKirtanData?.sequence_num ?? null,
        has_harmonium: false,
        is_rare_gem: true,
      }
    : null;

  /* 2. Recently added */
  const { data: recentlyAdded, error: recentlyAddedError } =
    await timing.measure(
      "db",
      async () =>
        await supabase
          .from("playable_kirtans")
          .select("*")
          .order("created_at", { ascending: false })
          .order("recorded_date", { ascending: false })
          .limit(10),
    );

  if (recentlyAddedError) {
    return jsonWithServerTiming({ error: recentlyAddedError.message }, timing, {
      status: 500,
    });
  }

  const recentIds = (recentlyAdded ?? []).map((k) => k.id);
  const featuredId = featuredKirtanData?.id ?? null;
  const harmoniumLookupIds = featuredId
    ? [featuredId, ...recentIds]
    : recentIds;

  const {
    harmoniumIds,
    rareGemIds,
    error: tagError,
  } = await timing.measure("tags", () =>
    fetchKirtanTagFlags(harmoniumLookupIds),
  );

  if (tagError) {
    return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
  }

  if (featuredId && featuredKirtan) {
    featuredKirtan.has_harmonium = harmoniumIds.has(featuredId);
    featuredKirtan.is_rare_gem = rareGemIds.has(featuredId);
  }

  const recentlyAddedKirtans: KirtanSummary[] =
    recentlyAdded?.map((k) => ({
      id: k.id,
      audio_url: k.audio_url,
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
    })) ?? [];

  const recentlyAddedNoDuplicates = recentlyAddedKirtans.filter(
    (k) => k.id !== featuredKirtan?.id,
  );

  return jsonWithServerTiming(
    {
      primary_action: featuredKirtan
        ? {
            type: "rare_gem",
            kirtan: featuredKirtan,
          }
        : null,

      continue_listening: null, // wired later

      entry_points: [
        { id: "MM", label: "Maha Mantras" },
        { id: "BHJ", label: "Bhajans" },
        { id: "LEADS", label: "Lead Singers" },
        { id: "OCCASIONS", label: "Occasions" },
      ],

      recently_added: recentlyAddedNoDuplicates,
    },
    timing,
  );
}
