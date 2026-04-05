import { ServerTiming, jsonWithServerTiming } from "@/lib/server/serverTiming";
import {
  fetchTaggedLeadKirtansPage,
  parseLeadType,
  resolveLeadTarget,
} from "@/lib/server/leadKirtans";

export const revalidate = 86400;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const timing = new ServerTiming();
  const { slug } = await context.params;
  const { searchParams } = new URL(req.url);
  const type = parseLeadType(searchParams.get("type"));
  const leadId = searchParams.get("lead_id");
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(50, limitParam)
      : 20;

  const { target, error: targetError, notFound } = await timing.measure(
    "lead",
    () => resolveLeadTarget(slug, leadId),
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

  const {
    kirtans,
    hasMore,
    nextCursor,
    error,
  } = await timing.measure("db", () =>
    fetchTaggedLeadKirtansPage({
      leadSingerId: target.kind === "single" ? target.leadSingerId : undefined,
      leadSingerIds: target.kind === "group" ? target.leadSingerIds : undefined,
      type,
      limit,
      cursorRecordedDate: searchParams.get("cursor_recorded_date"),
      cursorTitle: searchParams.get("cursor_title"),
      cursorId: searchParams.get("cursor_id"),
    }),
  );

  if (error) {
    return jsonWithServerTiming(
      { error },
      timing,
      { status: 500 },
    );
  }

  return jsonWithServerTiming(
    {
      type,
      has_more: hasMore,
      next_cursor: nextCursor,
      kirtans,
    },
    timing,
  );
}
