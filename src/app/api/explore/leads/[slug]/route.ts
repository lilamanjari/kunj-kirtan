import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import type { KirtanSummary } from "@/types/kirtan";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";

export const revalidate = 86400;

export async function GET(
  _: Request,
  context: { params: Promise<{ slug: string }> }, // note: Promise here
) {
  const timing = new ServerTiming();
  // unwrap the promise
  const { slug } = await context.params;

  /* 1. Load lead singer */
  const { data: lead, error: leadError } = await timing.measure("lead", async () =>
    await supabase
      .from("lead_singers")
      .select("id, display_name")
      .eq("slug", slug)
      .maybeSingle(),
  );

  if (leadError || !lead) {
    return jsonWithServerTiming(
      { error: "Lead singer not found" },
      timing,
      { status: 404 },
    );
  }

  /* 2. Load their kirtans */
  const { data: kirtans, error: kirtanError } = await timing.measure("db", async () =>
    await supabase
      .from("playable_kirtans")
      .select("*")
      .eq("lead_singer_id", lead.id)
      .order("recorded_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  );

  if (kirtanError) {
    return jsonWithServerTiming(
      { error: kirtanError.message },
      timing,
      { status: 500 },
    );
  }

  const { kirtan: featuredData, error: featuredError } =
    await timing.measure("featured", () =>
      getDailyRareGem({ leadSingerId: lead.id }),
    );

  if (featuredError) {
    return jsonWithServerTiming(
      { error: featuredError },
      timing,
      { status: 500 },
    );
  }

  const ids = (kirtans ?? []).map((k) => k.id);
  if (featuredData?.id) {
    ids.unshift(featuredData.id);
  }
  const { harmoniumIds, rareGemIds, error: tagError } =
    await timing.measure("tags", () => fetchKirtanTagFlags(ids));

  if (tagError) {
    return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
  }

  const featured: KirtanSummary | null = featuredData
    ? {
        id: featuredData.id,
        audio_url: featuredData.audio_url,
        type: featuredData.type === "MM" ? "MM" : "BHJ",
        title: featuredData.type === "MM" ? "Maha Mantra" : featuredData.title,
        lead_singer: featuredData.lead_singer,
        recorded_date: featuredData.recorded_date,
        recorded_date_precision: featuredData.recorded_date_precision ?? null,
        sanga: featuredData.sanga,
        duration_seconds: featuredData.duration_seconds,
        sequence_num: featuredData.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(featuredData.id),
        is_rare_gem: rareGemIds.has(featuredData.id),
      }
    : null;

  return jsonWithServerTiming(
    {
      lead,
      kirtans:
        kirtans?.map((k) => ({
          id: k.id,
          audio_url: k.audio_url,
          type: k.type === "MM" ? "MM" : "BHJ",
          title: k.type === "MM" ? "Maha Mantra" : k.title,
          lead_singer: k.lead_singer,
          recorded_date: k.recorded_date,
          recorded_date_precision: k.recorded_date_precision ?? null,
          sanga: k.sanga,
          duration_seconds: k.duration_seconds,
          sequence_num: k.sequence_num ?? null,
          has_harmonium: harmoniumIds.has(k.id),
          is_rare_gem: rareGemIds.has(k.id),
        })) ?? [],
      featured,
    },
    timing,
  );
}
