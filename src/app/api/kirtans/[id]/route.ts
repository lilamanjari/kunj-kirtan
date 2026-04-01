import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const timing = new ServerTiming();
  const { id } = await context.params;

  const { data, error } = await timing.measure("db", async () =>
    await supabase
      .from("playable_kirtans")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
  );

  if (error) {
    return jsonWithServerTiming(
      { error: error.message },
      timing,
      { status: 500 },
    );
  }

  if (!data) {
    return jsonWithServerTiming(
      { error: "Kirtan not found" },
      timing,
      { status: 404 },
    );
  }

  const { harmoniumIds, rareGemIds, error: tagError } =
    await timing.measure("tags", () => fetchKirtanTagFlags([id]));

  if (tagError) {
    return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
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

  return jsonWithServerTiming({ kirtan: payload }, timing);
}
