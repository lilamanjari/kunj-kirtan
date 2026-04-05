import { supabase } from "@/lib/supabase";
import type { KirtanType } from "@/types/kirtan";
import type { LeadCounts, LeadCursor } from "@/types/leads";

export const LEAD_TYPE_ORDER: KirtanType[] = ["MM", "BHJ", "HK"];

export function parseLeadType(value: string | null): KirtanType | null {
  if (value === "MM" || value === "BHJ" || value === "HK") {
    return value;
  }
  return null;
}

export function emptyLeadCounts(): LeadCounts {
  return { MM: 0, BHJ: 0, HK: 0 };
}

export function firstAvailableLeadType(counts: LeadCounts): KirtanType | null {
  return LEAD_TYPE_ORDER.find((type) => counts[type] > 0) ?? null;
}

export async function fetchLeadCounts(leadSingerId: string) {
  const countResults = await Promise.all(
    LEAD_TYPE_ORDER.map(async (type) => {
      const { count, error } = await supabase
        .from("playable_kirtans")
        .select("id", { count: "exact", head: true })
        .eq("lead_singer_id", leadSingerId)
        .eq("type", type);

      return { type, count: count ?? 0, error };
    }),
  );

  const countError = countResults.find((result) => result.error);
  if (countError?.error) {
    return {
      counts: emptyLeadCounts(),
      error: countError.error.message,
    };
  }

  const counts = countResults.reduce<LeadCounts>((acc, result) => {
    acc[result.type] = result.count;
    return acc;
  }, emptyLeadCounts());

  return { counts, error: null };
}

type FetchLeadKirtansArgs = {
  leadSingerId?: string;
  leadSingerIds?: string[];
  type: KirtanType | null;
  limit: number;
  cursorRecordedDate: string | null;
  cursorTitle: string | null;
  cursorId: string | null;
};

export async function fetchLeadKirtansPage({
  leadSingerId,
  leadSingerIds,
  type,
  limit,
  cursorRecordedDate,
  cursorTitle,
  cursorId,
}: FetchLeadKirtansArgs) {
  let query = supabase
    .from("playable_kirtans")
    .select("*");

  if (leadSingerIds && leadSingerIds.length > 0) {
    query = query.in("lead_singer_id", leadSingerIds);
  } else if (leadSingerId) {
    query = query.eq("lead_singer_id", leadSingerId);
  } else {
    return {
      rows: [],
      hasMore: false,
      nextCursor: null as LeadCursor,
      error: null,
    };
  }

  if (type) {
    query = query.eq("type", type);
    if (type === "BHJ") {
      query = query.order("title", { ascending: true }).order("id", {
        ascending: true,
      });
      if (cursorTitle && cursorId) {
        const safeTitle = cursorTitle.replace(/"/g, '\\"');
        query = query.or(
          `title.gt."${safeTitle}",and(title.eq."${safeTitle}",id.gt.${cursorId})`,
        );
      }
    } else {
      query = query
        .order("recorded_date", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });
      if (cursorRecordedDate && cursorId) {
        query = query.or(
          `recorded_date.lt.${cursorRecordedDate},and(recorded_date.eq.${cursorRecordedDate},id.lt.${cursorId})`,
        );
      } else if (cursorId) {
        query = query.is("recorded_date", null).lt("id", cursorId);
      }
    }
  } else {
    query = query
      .order("recorded_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });
  }

  const { data, error } = await query.limit(limit + 1);
  if (error) {
    return {
      rows: [],
      hasMore: false,
      nextCursor: null as LeadCursor,
      error: error.message,
    };
  }

  const rows = type && (data ?? []).length > limit
    ? (data ?? []).slice(0, limit)
    : (data ?? []);
  const hasMore = type ? (data ?? []).length > limit : false;
  const last = rows[rows.length - 1];
  const nextCursor: LeadCursor = !last
    ? null
    : type === "BHJ"
      ? { title: last.title, id: last.id }
      : { recorded_date: last.recorded_date, id: last.id };

  return {
    rows,
    hasMore,
    nextCursor,
    error: null,
  };
}
