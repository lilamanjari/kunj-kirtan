import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import type { BhajanAlphabetIndex, BhajanCursor } from "@/types/bhajans";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { buildBhajanAlphabetIndex } from "@/lib/server/bhajanAlphabet";

export const revalidate = 86400;

function escapeTitle(title: string) {
  return title.replace(/"/g, '\\"');
}

function mapCursor(row: { title: string; id: string } | undefined) {
  return row ? { title: row.title, id: row.id } satisfies BhajanCursor : null;
}

export async function GET(req: Request) {
  const timing = new ServerTiming();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const limit = Number(searchParams.get("limit") ?? "20");
  const cursorTitle = searchParams.get("cursor_title");
  const cursorId = searchParams.get("cursor_id");
  const startTitle = searchParams.get("start_title");
  const startId = searchParams.get("start_id");
  const beforeTitle = searchParams.get("before_title");
  const beforeId = searchParams.get("before_id");
  const shouldIncludeAlphabetIndex =
    !cursorTitle && !cursorId && !startTitle && !startId && !beforeTitle && !beforeId;

  const featured = await timing.measure("featured", () =>
    getDailyRareGem({ types: ["BHJ"] }),
  );

  if (featured.error) {
    return jsonWithServerTiming({ error: featured.error }, timing, {
      status: 500,
    });
  }

  let alphabetIndexResult: BhajanAlphabetIndex | null = null;
  if (shouldIncludeAlphabetIndex) {
    try {
      alphabetIndexResult = await timing.measure("alphabet", () =>
        buildBhajanAlphabetIndex(search),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to build alphabet index";
      return jsonWithServerTiming({ error: message }, timing, { status: 500 });
    }
  }

  const isBeforeQuery = Boolean(beforeTitle && beforeId);
  const isStartQuery = Boolean(startTitle && startId);
  let query = supabase.from("playable_kirtans").select("*").eq("type", "BHJ");

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (isBeforeQuery) {
    const safeTitle = escapeTitle(beforeTitle!);
    query = query
      .or(`title.lt."${safeTitle}",and(title.eq."${safeTitle}",id.lt.${beforeId})`)
      .order("title", { ascending: false })
      .order("id", { ascending: false });
  } else {
    query = query.order("title", { ascending: true }).order("id", { ascending: true });
    if (startTitle && startId) {
      const safeTitle = escapeTitle(startTitle);
      query = query.or(
        `title.gt."${safeTitle}",and(title.eq."${safeTitle}",id.gte.${startId})`,
      );
    } else if (cursorTitle && cursorId) {
      const safeTitle = escapeTitle(cursorTitle);
      query = query.or(
        `title.gt."${safeTitle}",and(title.eq."${safeTitle}",id.gt.${cursorId})`,
      );
    }
  }

  const { data, error } = await timing.measure("db", async () =>
    await query.limit(limit + 1),
  );

  if (error) {
    return jsonWithServerTiming({ error: error.message }, timing, {
      status: 500,
    });
  }

  let rows = data ?? [];
  let hasMore = false;
  let hasBefore = false;
  let nextCursor: BhajanCursor | null = null;
  let prevCursor: BhajanCursor | null = null;

  if (isBeforeQuery) {
    hasBefore = rows.length > limit;
    rows = rows.slice(0, limit).reverse();
    prevCursor = hasBefore ? mapCursor(rows[0]) : null;
    nextCursor = rows.length > 0 ? mapCursor(rows[rows.length - 1]) : null;
  } else {
    hasMore = rows.length > limit;
    rows = rows.slice(0, limit);
    nextCursor = hasMore ? mapCursor(rows[rows.length - 1]) : null;
    prevCursor = isStartQuery ? mapCursor(rows[0]) : null;
  }

  if (isStartQuery) {
    const firstRow = rows[0];
    if (firstRow) {
      const safeTitle = escapeTitle(firstRow.title);
      let beforeQuery = supabase
        .from("playable_kirtans")
        .select("id")
        .eq("type", "BHJ")
        .or(`title.lt."${safeTitle}",and(title.eq."${safeTitle}",id.lt.${firstRow.id})`)
        .limit(1);

      if (search) {
        beforeQuery = beforeQuery.ilike("title", `%${search}%`);
      }

      const { data: beforeData, error: beforeError } = await timing.measure("before", async () =>
        await beforeQuery,
      );

      if (beforeError) {
        return jsonWithServerTiming({ error: beforeError.message }, timing, {
          status: 500,
        });
      }

      hasBefore = (beforeData?.length ?? 0) > 0;
    } else {
      prevCursor = null;
      hasBefore = false;
    }
  }

  const ids = rows.map((k) => k.id);
  if (featured.kirtan?.id) {
    ids.unshift(featured.kirtan.id);
  }
  const { harmoniumIds, rareGemIds, error: tagError } = await timing.measure(
    "tags",
    () => fetchKirtanTagFlags(ids),
  );

  if (tagError) {
    return jsonWithServerTiming({ error: tagError }, timing, { status: 500 });
  }

  const bhajans: KirtanSummary[] = rows.map((k) => ({
    id: k.id,
    audio_url: k.audio_url ?? "",
    type: k.type,
    title: k.title,
    lead_singer: k.lead_singer,
    recorded_date: k.recorded_date,
    recorded_date_precision: k.recorded_date_precision ?? null,
    sanga: k.sanga,
    duration_seconds: k.duration_seconds,
    sequence_num: k.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(k.id),
    is_rare_gem: rareGemIds.has(k.id),
  }));

  const featuredKirtan: KirtanSummary | null = featured.kirtan
    ? {
        id: featured.kirtan.id,
        audio_url: featured.kirtan.audio_url ?? "",
        type: featured.kirtan.type,
        title: featured.kirtan.title,
        lead_singer: featured.kirtan.lead_singer,
        recorded_date: featured.kirtan.recorded_date,
        recorded_date_precision: featured.kirtan.recorded_date_precision ?? null,
        sanga: featured.kirtan.sanga,
        duration_seconds: featured.kirtan.duration_seconds,
        sequence_num: featured.kirtan.sequence_num ?? null,
        has_harmonium: harmoniumIds.has(featured.kirtan.id),
        is_rare_gem: rareGemIds.has(featured.kirtan.id),
      }
    : null;

  return jsonWithServerTiming(
    {
      bhajans,
      has_more: hasMore,
      has_before: hasBefore,
      next_cursor: nextCursor,
      prev_cursor: prevCursor,
      featured: featuredKirtan,
      alphabet_index: alphabetIndexResult ?? undefined,
    },
    timing,
  );
}
