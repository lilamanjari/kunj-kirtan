import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  let query = supabase
    .from("playable_kirtans")
    .select("id, audio_url, type, title, lead_singer, recorded_date, sanga")
    .eq("type", "MM")
    .order("recorded_date", { ascending: false });

  if (search) {
    query = query.ilike("lead_singer", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mantras: KirtanSummary[] = (data ?? []).map((k) => ({
    id: k.id,
    audio_url: k.audio_url,
    type: "MM",
    title: "Maha Mantra",
    lead_singer: k.lead_singer,
    recorded_date: k.recorded_date,
    sanga: k.sanga,
  }));

  return NextResponse.json({ mantras });
}
