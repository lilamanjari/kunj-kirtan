import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchHarmoniumIds } from "@/lib/server/harmonium";
import { toProxyAudioUrl } from "@/lib/server/audioProxy";
import { getDailyRareGem } from "@/lib/server/featured";
import type { KirtanSummary } from "@/types/kirtan";

export async function GET(
  _: Request,
  context: { params: Promise<{ slug: string }> }, // note: Promise here
) {
  // unwrap the promise
  const { slug } = await context.params;

  /* 1. Load lead singer */
  const { data: lead, error: leadError } = await supabase
    .from("lead_singers")
    .select("id, display_name")
    .eq("slug", slug)
    .maybeSingle();

  if (leadError || !lead) {
    return NextResponse.json(
      { error: "Lead singer not found" },
      { status: 404 },
    );
  }

  /* 2. Load their kirtans */
  const { data: kirtans, error: kirtanError } = await supabase
    .from("playable_kirtans")
    .select("*")
    .eq("lead_singer_id", lead.id)
    .order("type", { ascending: true })
    .order("sort_key_created", { ascending: false })
    .order("sort_key_alpha", { ascending: true });

  if (kirtanError) {
    return NextResponse.json({ error: kirtanError.message }, { status: 500 });
  }

  const { kirtan: featuredData, error: featuredError } =
    await getDailyRareGem({ leadSingerId: lead.id });

  if (featuredError) {
    return NextResponse.json({ error: featuredError }, { status: 500 });
  }

  const ids = (kirtans ?? []).map((k) => k.id);
  if (featuredData?.id) {
    ids.unshift(featuredData.id);
  }
  const { harmoniumIds, error: harmoniumError } =
    await fetchHarmoniumIds(ids);

  if (harmoniumError) {
    return NextResponse.json({ error: harmoniumError }, { status: 500 });
  }

  const featured: KirtanSummary | null = featuredData
    ? {
        id: featuredData.id,
        audio_url: toProxyAudioUrl(featuredData.audio_url),
        type: featuredData.type === "MM" ? "MM" : "BHJ",
        title: featuredData.type === "MM" ? "Maha Mantra" : featuredData.title,
        lead_singer: featuredData.lead_singer,
        recorded_date: featuredData.recorded_date,
        recorded_date_precision: featuredData.recorded_date_precision ?? null,
        sanga: featuredData.sanga,
        duration_seconds: featuredData.duration_seconds,
        sequence_num: featuredData.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(featuredData.id),
      }
    : null;

  return NextResponse.json({
    lead,
    kirtans:
      kirtans?.map((k) => ({
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
      })) ?? [],
    featured,
  });
}
