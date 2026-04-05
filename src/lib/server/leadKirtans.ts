import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  fetchLeadDirectory,
  OTHER_LEAD_ID,
  OTHER_LEAD_LABEL,
  OTHER_LEAD_SLUG,
} from "@/lib/server/leadDirectory";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
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

export type LeadTarget =
  | {
      kind: "single";
      lead: { id: string; display_name: string };
      leadSingerId: string;
      counts: LeadCounts;
    }
  | {
      kind: "group";
      lead: { id: typeof OTHER_LEAD_ID; display_name: typeof OTHER_LEAD_LABEL };
      leadSingerIds: string[];
      counts: LeadCounts;
    };

export async function resolveLeadTarget(slug: string, leadId?: string | null) {
  if (slug === OTHER_LEAD_SLUG || leadId === OTHER_LEAD_ID) {
    const { otherLeadIds, otherCounts, error } = await fetchLeadDirectory();
    if (error) {
      return { target: null as LeadTarget | null, error, notFound: false };
    }
    if (otherLeadIds.length === 0) {
      return {
        target: null as LeadTarget | null,
        error: "Lead singer not found",
        notFound: true,
      };
    }

    return {
      target: {
        kind: "group" as const,
        lead: {
          id: OTHER_LEAD_ID,
          display_name: OTHER_LEAD_LABEL,
        },
        leadSingerIds: otherLeadIds,
        counts: otherCounts,
      },
      error: null,
      notFound: false,
    };
  }

  if (!leadId) {
    const { data: lead, error } = await supabase
      .from("lead_singers")
      .select("id, display_name")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !lead) {
      return {
        target: null as LeadTarget | null,
        error: "Lead singer not found",
        notFound: true,
      };
    }

    return {
      target: {
        kind: "single" as const,
        lead,
        leadSingerId: lead.id,
        counts: emptyLeadCounts(),
      },
      error: null,
      notFound: false,
    };
  }

  return {
    target: {
      kind: "single" as const,
      lead: {
        id: leadId,
        display_name: "",
      },
      leadSingerId: leadId,
      counts: emptyLeadCounts(),
    },
    error: null,
    notFound: false,
  };
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

export async function fetchTaggedLeadKirtansPage({
  leadSingerId,
  leadSingerIds,
  type,
  limit,
  cursorRecordedDate,
  cursorTitle,
  cursorId,
}: FetchLeadKirtansArgs) {
  const {
    rows,
    hasMore,
    nextCursor,
    error: kirtanError,
  } = await fetchLeadKirtansPage({
    leadSingerId,
    leadSingerIds,
    type,
    limit,
    cursorRecordedDate,
    cursorTitle,
    cursorId,
  });

  if (kirtanError) {
    return {
      kirtans: [] as KirtanSummary[],
      hasMore: false,
      nextCursor: null as LeadCursor,
      error: kirtanError,
    };
  }

  const ids = rows.map((row) => row.id);
  const { harmoniumIds, rareGemIds, error: tagError } =
    await fetchKirtanTagFlags(ids);

  if (tagError) {
    return {
      kirtans: [] as KirtanSummary[],
      hasMore: false,
      nextCursor: null as LeadCursor,
      error: tagError,
    };
  }

  const kirtans: KirtanSummary[] = rows.map((k) => ({
    id: k.id,
    audio_url: k.audio_url,
    type: k.type as KirtanType,
    title: formatKirtanTitle(k.type as KirtanType, k.title),
    lead_singer: k.lead_singer,
    recorded_date: k.recorded_date,
    recorded_date_precision: k.recorded_date_precision ?? null,
    sanga: k.sanga,
    duration_seconds: k.duration_seconds,
    sequence_num: k.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(k.id),
    is_rare_gem: rareGemIds.has(k.id),
  }));

  return {
    kirtans,
    hasMore,
    nextCursor,
    error: null,
  };
}
