import { getDailyRareGem } from "@/lib/server/featured";
import type { KirtanSummary } from "@/types/kirtan";
import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  fetchLeadCounts,
  fetchTaggedLeadKirtansPage,
  firstAvailableLeadType,
  parseLeadType,
  resolveLeadTarget,
} from "@/lib/server/leadKirtans";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";

export const revalidate = 86400;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }, // note: Promise here
) {
  const timing = new ServerTiming();
  const { searchParams } = new URL(req.url);
  const requestedType = parseLeadType(searchParams.get("type"));
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const cursorRecordedDate = searchParams.get("cursor_recorded_date");
  const cursorTitle = searchParams.get("cursor_title");
  const cursorId = searchParams.get("cursor_id");
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(50, limitParam)
      : 20;

  // unwrap the promise
  const { slug } = await context.params;

  const { target, error: targetError, notFound } = await timing.measure(
    "lead",
    () => resolveLeadTarget(slug),
  );

  if (targetError) {
    return jsonWithServerTiming(
      { error: targetError },
      timing,
      { status: notFound ? 404 : 500 },
    );
  }

  if (!target) {
    return jsonWithServerTiming(
      { error: "Lead singer not found" },
      timing,
      { status: 404 },
    );
  }

  let counts = target.counts;
  if (target.kind === "single") {
    const { counts: resolvedCounts, error: countsError } = await timing.measure(
      "counts",
      () => fetchLeadCounts(target.leadSingerId),
    );
    if (countsError) {
      return jsonWithServerTiming(
        { error: countsError },
        timing,
        { status: 500 },
      );
    }
    counts = resolvedCounts;
  }

  const activeType = requestedType && counts[requestedType] > 0
    ? requestedType
    : firstAvailableLeadType(counts);

  const { kirtan: featuredData, error: featuredError } =
    target.kind === "single"
      ? await timing.measure("featured", () =>
          getDailyRareGem({ leadSingerId: target.leadSingerId }),
        )
      : await timing.measure("featured", () =>
          getDailyRareGem({ leadSingerIds: target.leadSingerIds }),
        );

  if (featuredError) {
    return jsonWithServerTiming(
      { error: featuredError },
      timing,
      { status: 500 },
    );
  }

  const {
    kirtans,
    hasMore,
    nextCursor,
    error,
  } = await timing.measure("db", () =>
    fetchTaggedLeadKirtansPage({
      leadSingerId: target.kind === "single" ? target.leadSingerId : undefined,
      leadSingerIds: target.kind === "group" ? target.leadSingerIds : undefined,
      type: activeType,
      limit,
      cursorRecordedDate,
      cursorTitle,
      cursorId,
    }),
  );

  if (error) {
    return jsonWithServerTiming(
      { error },
      timing,
      { status: 500 },
    );
  }

  let featured: KirtanSummary | null = null;
  if (featuredData) {
    const {
      harmoniumIds,
      rareGemIds,
      error: tagError,
    } = await timing.measure("tags", () => fetchKirtanTagFlags([featuredData.id]));

    if (tagError) {
      return jsonWithServerTiming(
        { error: tagError },
        timing,
        { status: 500 },
      );
    }

    featured = {
      id: featuredData.id,
      audio_url: featuredData.audio_url ?? "",
      type: featuredData.type,
      title: formatKirtanTitle(
        featuredData.type,
        featuredData.title,
      ),
      lead_singer: featuredData.lead_singer,
      recorded_date: featuredData.recorded_date,
      recorded_date_precision: featuredData.recorded_date_precision ?? null,
      sanga: featuredData.sanga,
      duration_seconds: featuredData.duration_seconds,
      sequence_num: featuredData.sequence_num ?? null,
      has_harmonium: harmoniumIds.has(featuredData.id),
      is_rare_gem: rareGemIds.has(featuredData.id),
    };
  }

  return jsonWithServerTiming(
    {
      lead: target.lead,
      counts,
      active_type: activeType,
      has_more: hasMore,
      next_cursor: nextCursor,
      kirtans,
      featured,
    },
    timing,
  );
}
