import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { formatKirtanTitle } from "@/lib/kirtanTitle";

export const revalidate = 86400;

export async function GET(
  _: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const timing = new ServerTiming();
  const { slug } = await context.params;

  const { data: tag, error: tagError } = await timing.measure("tag", async () =>
    await supabase
      .from("tags")
      .select("id, name, slug")
      .eq("slug", slug)
      .eq("category", "occasion")
      .maybeSingle(),
  );

  if (tagError || !tag) {
    return jsonWithServerTiming(
      { error: "Occasion not found" },
      timing,
      { status: 404 },
    );
  }

  const { data: tagLinks, error: linkError } = await timing.measure("links", async () =>
    await supabase
      .from("kirtan_tag_slugs")
      .select("kirtan_id")
      .eq("slug", slug),
  );

  if (linkError) {
    return jsonWithServerTiming(
      { error: linkError.message },
      timing,
      { status: 500 },
    );
  }

  const ids = (tagLinks ?? []).map((row) => row.kirtan_id);
  if (ids.length === 0) {
    return jsonWithServerTiming({ tag, kirtans: [] }, timing);
  }

  const { data: kirtans, error: kirtanError } = await timing.measure("db", async () =>
    await supabase
      .from("playable_kirtans")
      .select("*")
      .in("id", ids)
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

  const kirtanIds = (kirtans ?? []).map((k) => k.id);
  const { harmoniumIds, rareGemIds, error: flagsError } =
    await timing.measure("flags", () => fetchKirtanTagFlags(kirtanIds));

  if (flagsError) {
    return jsonWithServerTiming(
      { error: flagsError },
      timing,
      { status: 500 },
    );
  }

  const payload: KirtanSummary[] =
    kirtans?.map((k) => ({
      id: k.id,
      audio_url: k.audio_url,
      type: k.type === "MM" ? "MM" : "BHJ",
      title: formatKirtanTitle(k.type === "MM" ? "MM" : "BHJ", k.title),
      lead_singer: k.lead_singer,
      recorded_date: k.recorded_date,
      recorded_date_precision: k.recorded_date_precision ?? null,
      sanga: k.sanga,
      duration_seconds: k.duration_seconds,
      sequence_num: k.sequence_num ?? null,
      has_harmonium: harmoniumIds.has(k.id),
      is_rare_gem: rareGemIds.has(k.id),
    })) ?? [];

  return jsonWithServerTiming({ tag, kirtans: payload }, timing);
}
