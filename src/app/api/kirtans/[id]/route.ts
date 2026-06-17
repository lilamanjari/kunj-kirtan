import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { fetchPrimaryLeadSingerImages } from "@/lib/server/leadSingerImages";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const timing = new ServerTiming();
  const { id } = await context.params;

  const { data, error } = await timing.measure("db", async () =>
    await supabase
      .from("playable_kirtans_with_titles")
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

  const { imagesByLeadSingerId, error: imageError } = data.lead_singer_id
    ? await timing.measure("lead-image", () =>
        fetchPrimaryLeadSingerImages([data.lead_singer_id as string]),
      )
    : { imagesByLeadSingerId: new Map(), error: null };

  if (imageError) {
    return jsonWithServerTiming({ error: imageError }, timing, { status: 500 });
  }

  const leadSingerImage = data.lead_singer_id
    ? imagesByLeadSingerId.get(data.lead_singer_id as string)
    : null;

  const payload: KirtanSummary = {
    id: data.id,
    audio_url: data.audio_url,
    type: data.type as KirtanType,
    title: getDisplayKirtanTitle(data),
    lead_singer: data.lead_singer,
    lead_singer_id: data.lead_singer_id ?? null,
    lead_singer_image_url: leadSingerImage?.url ?? null,
    lead_singer_image_alt: leadSingerImage?.alt_text ?? data.lead_singer,
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
