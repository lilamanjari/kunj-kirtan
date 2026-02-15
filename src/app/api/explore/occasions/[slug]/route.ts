import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchHarmoniumIds } from "@/lib/server/harmonium";

export async function GET(
  _: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("category", "occasion")
    .maybeSingle();

  if (tagError || !tag) {
    return NextResponse.json({ error: "Occasion not found" }, { status: 404 });
  }

  const { data: tagLinks, error: linkError } = await supabase
    .from("kirtan_tag_slugs")
    .select("kirtan_id")
    .eq("slug", slug);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const ids = (tagLinks ?? []).map((row) => row.kirtan_id);
  if (ids.length === 0) {
    return NextResponse.json({ tag, kirtans: [] });
  }

  const { data: kirtans, error: kirtanError } = await supabase
    .from("playable_kirtans")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false })
    .order("recorded_date", { ascending: false });

  if (kirtanError) {
    return NextResponse.json({ error: kirtanError.message }, { status: 500 });
  }

  const kirtanIds = (kirtans ?? []).map((k) => k.id);
  const { harmoniumIds, error: harmoniumError } =
    await fetchHarmoniumIds(kirtanIds);

  if (harmoniumError) {
    return NextResponse.json({ error: harmoniumError }, { status: 500 });
  }

  const payload: KirtanSummary[] =
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
    })) ?? [];

  return NextResponse.json({ tag, kirtans: payload });
}
