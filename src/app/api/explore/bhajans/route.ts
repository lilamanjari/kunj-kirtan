import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchHarmoniumIds } from "@/lib/server/harmonium";
import { toProxyAudioUrl } from "@/lib/server/audioProxy";
import { getDailyRareGem } from "@/lib/server/featured";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const limit = Number(searchParams.get("limit") ?? "20");
  const cursorTitle = searchParams.get("cursor_title");
  const cursorId = searchParams.get("cursor_id");

  let query = supabase
    .from("playable_kirtans")
    .select("*")
    .eq("type", "BHJ")
    .order("title", { ascending: true })
    .order("id", { ascending: true });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const featured =
    search?.length ?? 0
      ? { kirtan: null, error: null }
      : await getDailyRareGem("BHJ");

  if (featured.error) {
    return NextResponse.json({ error: featured.error }, { status: 500 });
  }

  if (cursorTitle && cursorId) {
    const safeTitle = cursorTitle.replace(/"/g, '\\"');
    query = query.or(
      `title.gt."${safeTitle}",and(title.eq."${safeTitle}",id.gt.${cursorId})`,
    );
  }

  const { data, error } = await query.limit(limit + 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).slice(0, limit);
  const hasMore = (data ?? []).length > limit;
  const last = rows[rows.length - 1];
  const nextCursor = hasMore && last
    ? { title: last.title, id: last.id }
    : null;

  const ids = rows.map((k) => k.id);
  if (featured.kirtan?.id) {
    ids.unshift(featured.kirtan.id);
  }
  const { harmoniumIds, error: harmoniumError } =
    await fetchHarmoniumIds(ids);

  if (harmoniumError) {
    return NextResponse.json({ error: harmoniumError }, { status: 500 });
  }

  const bhajans: KirtanSummary[] = rows.map((k) => ({
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

  const featuredKirtan: KirtanSummary | null = featured.kirtan
    ? {
        id: featured.kirtan.id,
        audio_url: toProxyAudioUrl(featured.kirtan.audio_url),
        type: featured.kirtan.type,
        title: featured.kirtan.title,
        lead_singer: featured.kirtan.lead_singer,
        recorded_date: featured.kirtan.recorded_date,
        recorded_date_precision: featured.kirtan.recorded_date_precision ?? null,
        sanga: featured.kirtan.sanga,
        duration_seconds: featured.kirtan.duration_seconds,
        sequence_num: featured.kirtan.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(featured.kirtan.id),
      }
    : null;

  return NextResponse.json({
    bhajans,
    has_more: hasMore,
    next_cursor: nextCursor,
    featured: featuredKirtan,
  });
}
