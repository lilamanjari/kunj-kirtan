import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchHarmoniumIds } from "@/lib/server/harmonium";
import { toProxyAudioUrl } from "@/lib/server/audioProxy";
import { getDailyRareGem } from "@/lib/server/featured";

export const revalidate = 86400;

export async function GET() {
  /* 1. Rare gem */

  const { kirtan: featuredKirtanData, error: featuredError } =
    await getDailyRareGem();

  if (featuredError) {
    return NextResponse.json({ error: featuredError }, { status: 500 });
  }

  const featuredKirtan: KirtanSummary | null = featuredKirtanData
    ? {
    id: featuredKirtanData?.id,
    audio_url: toProxyAudioUrl(featuredKirtanData?.audio_url),
    type: featuredKirtanData?.type === "MM" ? "MM" : "BHJ",
    title:
      featuredKirtanData?.type === "MM"
        ? "Maha Mantra"
        : featuredKirtanData?.title,
    lead_singer: featuredKirtanData?.lead_singer,
    recorded_date: featuredKirtanData?.recorded_date,
    recorded_date_precision:
      featuredKirtanData?.recorded_date_precision ?? null,
    sanga: featuredKirtanData?.sanga,
    duration_seconds: featuredKirtanData?.duration_seconds,
    sequence_num: featuredKirtanData?.sequence_num ?? null,
    has_harmonium: false,
      }
    : null;

  /* 2. Recently added */
  const { data: recentlyAdded, error: recentlyAddedError } = await supabase
    .from("playable_kirtans")
    .select("*")
    .order("created_at", { ascending: false })
    .order("recorded_date", { ascending: false })
    .limit(10);

  if (recentlyAddedError) {
    return NextResponse.json(
      { error: recentlyAddedError.message },
      { status: 500 },
    );
  }

  const recentIds = (recentlyAdded ?? []).map((k) => k.id);
  const featuredId = featuredKirtanData?.id ?? null;
  const harmoniumLookupIds = featuredId
    ? [featuredId, ...recentIds]
    : recentIds;

  const { harmoniumIds, error: harmoniumError } =
    await fetchHarmoniumIds(harmoniumLookupIds);

  if (harmoniumError) {
    return NextResponse.json({ error: harmoniumError }, { status: 500 });
  }

  if (featuredId && featuredKirtan) {
    featuredKirtan.has_harmonium = harmoniumIds.has(featuredId);
  }

  const recentlyAddedKirtans: KirtanSummary[] =
    recentlyAdded?.map((k) => ({
      id: k.id,
      audio_url: toProxyAudioUrl(k.audio_url),
      type: k.type === "MM" ? "MM" : "BHJ",
      title: k.type === "MM" ? "Maha Mantra" : k.title,
      lead_singer: k.lead_singer,
      recorded_date: k.recorded_date,
      recorded_date_precision: k.recorded_date_precision ?? null,
      sanga: k.sanga,
      duration_seconds: k.duration_seconds,
      sequence_num: k.sequence_num ?? null,
      has_harmonium: harmoniumIds.has(k.id),
    })) ?? [];

  const recentlyAddedNoDuplicates = recentlyAddedKirtans.filter(
    (k) => k.id !== featuredKirtan?.id,
  );

  return NextResponse.json({
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
  });

  /* Hard coded rare gem
  const rareGem = {
    id: "test-rare-gem",
    type: "bhajan",
    title: "Test Rare Gem",
    lead_singer: "Avadhut Maharaj",
  };
*/

  /* Hard coded Recently Added
  const recentlyAdded = [
    {
      id: "test-1",
      type: "bhajan",
      title: "Test Kirtan One",
      lead_singers: [{ display_name: "Avadhut Maharaj" }],
    },
    {
      id: "test-2",
      type: "maha_mantra",
      title: "Test Kirtan Two",
      lead_singers: [{ display_name: "Gauranga (Germany)" }],
    },
  ];
*/

  /* Hard coded response
  return NextResponse.json({
    primary_action: {
      type: "rare_gem",
      kirtan_id: "test-id",
    },

    continue_listening: null, // wired later

    entry_points: [
      { id: "MM", label: "Maha Mantras" },
      { id: "BHJ", label: "Bhajans" },
      { id: "LEADS", label: "Lead Singers" },
      { id: "OCCASIONS", label: "Occasions" },
    ],

    recently_added: [
      {
        kirtan_id: "static-1",
        type: "bhajan",
        title: "Static Recently Added",
        lead_singer: "Test Singer",
      },
    ],
  });
*/
}
