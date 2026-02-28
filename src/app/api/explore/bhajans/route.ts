import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchHarmoniumIds } from "@/lib/server/harmonium";
import { toProxyAudioUrl } from "@/lib/server/audioProxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  let query = supabase
    .from("playable_kirtans")
    .select("*")
    .eq("type", "BHJ")
    .order("title", { ascending: true });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (data ?? []).map((k) => k.id);
  const { harmoniumIds, error: harmoniumError } =
    await fetchHarmoniumIds(ids);

  if (harmoniumError) {
    return NextResponse.json({ error: harmoniumError }, { status: 500 });
  }

  const bhajans: KirtanSummary[] = (data ?? []).map((k) => ({
    id: k.id,
    audio_url: toProxyAudioUrl(k.audio_url),
    type: k.type,
    title: k.title,
    lead_singer: k.lead_singer,
    recorded_date: k.recorded_date,
    recorded_date_precision: k.recorded_date_precision ?? null,
    sanga: k.sanga,
    duration_seconds: k.duration_seconds,
    sequence_num: k.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(k.id),
  }));

  return NextResponse.json({
    bhajans,
  });
}
