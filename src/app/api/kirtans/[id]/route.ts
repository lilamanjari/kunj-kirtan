import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("playable_kirtans")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Kirtan not found" }, { status: 404 });
  }

  const { harmoniumIds, rareGemIds, error: tagError } =
    await fetchKirtanTagFlags([id]);

  if (tagError) {
    return NextResponse.json({ error: tagError }, { status: 500 });
  }

  const payload: KirtanSummary = {
    id: data.id,
    audio_url: data.audio_url,
    type: data.type === "MM" ? "MM" : "BHJ",
    title: data.type === "MM" ? "Maha Mantra" : data.title,
    lead_singer: data.lead_singer,
    recorded_date: data.recorded_date,
    recorded_date_precision: data.recorded_date_precision ?? null,
    sanga: data.sanga,
    duration_seconds: data.duration_seconds,
    sequence_num: data.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(id),
    is_rare_gem: rareGemIds.has(id),
  };

  return NextResponse.json({ kirtan: payload });
}
