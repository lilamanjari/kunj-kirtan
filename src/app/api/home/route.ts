import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";

export async function GET() {
  /* 1. Rare gem */

  const { data: rareGemKirtans, error: tagError } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id")
    .eq("slug", "rare-gem");

  if (tagError) {
    return NextResponse.json({ error: tagError.message }, { status: 500 });
  }

  const rareGemKirtanIds = rareGemKirtans?.map((r) => r.kirtan_id) ?? [];
  const { data: featuredKirtanData, error: featuredKirtanError } =
    await supabase
      .from("playable_kirtans")
      .select("*")
      .in("id", rareGemKirtanIds)
      .limit(1)
      .maybeSingle();

  if (featuredKirtanError) {
    return NextResponse.json(
      { error: featuredKirtanError.message },
      { status: 500 },
    );
  }

  console.log("featuredKirtan raw:", featuredKirtanData);

  const featuredKirtan: KirtanSummary = {
    id: featuredKirtanData?.id,
    audio_url: featuredKirtanData?.audio_url,
    type: featuredKirtanData?.type === "MM" ? "MM" : "BHJ",
    title:
      featuredKirtanData?.type === "MM"
        ? "Maha Mantra"
        : featuredKirtanData?.title,
    lead_singer: featuredKirtanData?.lead_singer,
    recorded_date: "22. Nov 2025",
    sanga: featuredKirtanData?.sanga,
  };

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

  const recentlyAddedKirtans: KirtanSummary[] =
    recentlyAdded?.map((k) => ({
      id: k.id,
      audio_url: k.audio_url,
      type: k.type === "MM" ? "MM" : "BHJ",
      title: k.type === "MM" ? "Maha Mantra" : k.title,
      lead_singer: k.lead_singer,
      recorded_date: k.recorded_date,
      sanga: k.sanga,
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
