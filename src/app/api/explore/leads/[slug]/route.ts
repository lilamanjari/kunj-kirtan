import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchHarmoniumIds } from "@/lib/server/harmonium";

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

  const ids = (kirtans ?? []).map((k) => k.id);
  const { harmoniumIds, error: harmoniumError } =
    await fetchHarmoniumIds(ids);

  if (harmoniumError) {
    return NextResponse.json({ error: harmoniumError }, { status: 500 });
  }

  return NextResponse.json({
    lead,
    kirtans:
      kirtans?.map((k) => ({
        id: k.id,
        audio_url: k.audio_url,
        type: k.type === "MM" ? "MM" : "BHJ",
        title: k.type === "MM" ? "Maha Mantra" : k.title,
        lead_singer: k.lead_singer,
        recorded_date: k.recorded_date,
        sanga: k.sanga,
        duration_seconds: k.duration_seconds,
        sequence_num: k.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(k.id),
      })) ?? [],
  });
}
