import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import type {
  KirtanSummary,
  KirtanType,
  RecordedDatePrecision,
} from "@/types/kirtan";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { LeadResponse } from "@/types/leads";
import {
  fetchLeadCounts,
  fetchLeadKirtansPage,
  firstAvailableLeadType,
} from "@/lib/server/leadKirtans";
import {
  fetchLeadDirectory,
  OTHER_LEAD_ID,
  OTHER_LEAD_LABEL,
  OTHER_LEAD_SLUG,
} from "@/lib/server/leadDirectory";

function normalizeRecordedDatePrecision(
  value: string | null | undefined,
): RecordedDatePrecision | null {
  if (value === "day" || value === "month" || value === "year") {
    return value;
  }
  return null;
}

function mapFeaturedKirtan(
  featuredData: {
    id: string;
    audio_url: string;
    type: string;
    title: string;
    lead_singer: string | null;
    recorded_date: string | null;
    recorded_date_precision?: string | null;
    sanga: string;
    duration_seconds?: number | null;
    sequence_num?: number | null;
  } | null,
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
): KirtanSummary | null {
  if (!featuredData) return null;

  return {
    id: featuredData.id,
    audio_url: featuredData.audio_url,
    type: featuredData.type as KirtanType,
    title: formatKirtanTitle(
      featuredData.type as KirtanType,
      featuredData.title,
    ),
    lead_singer: featuredData.lead_singer,
    recorded_date: featuredData.recorded_date,
    recorded_date_precision: normalizeRecordedDatePrecision(
      featuredData.recorded_date_precision,
    ),
    sanga: featuredData.sanga,
    duration_seconds: featuredData.duration_seconds,
    sequence_num: featuredData.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(featuredData.id),
    is_rare_gem: rareGemIds.has(featuredData.id),
  };
}

function mapLeadKirtans(
  rows: Array<{
    id: string;
    audio_url: string;
    type: string;
    title: string;
    lead_singer: string | null;
    recorded_date: string | null;
    recorded_date_precision?: string | null;
    sanga: string;
    duration_seconds?: number | null;
    sequence_num?: number | null;
  }>,
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
): KirtanSummary[] {
  return rows.map((k) => ({
    id: k.id,
    audio_url: k.audio_url,
    type: k.type as KirtanType,
    title: formatKirtanTitle(k.type as KirtanType, k.title),
    lead_singer: k.lead_singer,
    recorded_date: k.recorded_date,
    recorded_date_precision: normalizeRecordedDatePrecision(
      k.recorded_date_precision,
    ),
    sanga: k.sanga,
    duration_seconds: k.duration_seconds,
    sequence_num: k.sequence_num ?? null,
    has_harmonium: harmoniumIds.has(k.id),
    is_rare_gem: rareGemIds.has(k.id),
  }));
}

const getCachedOtherLeadPageData = unstable_cache(
  async () => {
    const {
      otherLeadIds,
      otherCounts,
      error: directoryError,
    } = await fetchLeadDirectory();

    if (directoryError) {
      return { data: null, error: directoryError, status: 500 };
    }

    if (otherLeadIds.length === 0) {
      return { data: null, error: "Lead singer not found", status: 404 };
    }

    const activeType = firstAvailableLeadType(otherCounts);
    const { kirtan: featuredData, error: featuredError } =
      await getDailyRareGem({ leadSingerIds: otherLeadIds });

    if (featuredError) {
      return { data: null, error: featuredError, status: 500 };
    }

    const {
      rows,
      hasMore,
      nextCursor,
      error: kirtanError,
    } = await fetchLeadKirtansPage({
      leadSingerIds: otherLeadIds,
      type: activeType,
      limit: 20,
      cursorRecordedDate: null,
      cursorTitle: null,
      cursorId: null,
    });

    if (kirtanError) {
      return { data: null, error: kirtanError, status: 500 };
    }

    const ids = rows.map((k) => k.id);
    if (featuredData?.id) {
      ids.unshift(featuredData.id);
    }

    const {
      harmoniumIds,
      rareGemIds,
      error: tagError,
    } = await fetchKirtanTagFlags(ids);

    if (tagError) {
      return { data: null, error: tagError, status: 500 };
    }

    const data: LeadResponse = {
      lead: {
        id: OTHER_LEAD_ID,
        display_name: OTHER_LEAD_LABEL,
      },
      counts: otherCounts,
      active_type: activeType,
      has_more: hasMore,
      next_cursor: nextCursor,
      kirtans: mapLeadKirtans(rows, harmoniumIds, rareGemIds),
      featured: mapFeaturedKirtan(featuredData, harmoniumIds, rareGemIds),
    };

    return {
      data,
      error: null,
      status: 200,
    };
  },
  ["lead-page-data-others"],
  {
    revalidate: 86400,
    tags: ["explore-leads-slugs", "rare-gems"],
  },
);

const getCachedSingleLeadPageData = unstable_cache(
  async (leadId: string, displayName: string) => {
    const { counts, error: countsError } = await fetchLeadCounts(leadId);
    if (countsError) {
      return { data: null, error: countsError, status: 500 };
    }

    const activeType = firstAvailableLeadType(counts);
    const { kirtan: featuredData, error: featuredError } =
      await getDailyRareGem({ leadSingerId: leadId });

    if (featuredError) {
      return { data: null, error: featuredError, status: 500 };
    }

    const {
      rows,
      hasMore,
      nextCursor,
      error: kirtanError,
    } = await fetchLeadKirtansPage({
      leadSingerId: leadId,
      type: activeType,
      limit: 20,
      cursorRecordedDate: null,
      cursorTitle: null,
      cursorId: null,
    });

    if (kirtanError) {
      return { data: null, error: kirtanError, status: 500 };
    }

    const ids = rows.map((k) => k.id);
    if (featuredData?.id) {
      ids.unshift(featuredData.id);
    }

    const {
      harmoniumIds,
      rareGemIds,
      error: tagError,
    } = await fetchKirtanTagFlags(ids);

    if (tagError) {
      return { data: null, error: tagError, status: 500 };
    }

    const data: LeadResponse = {
      lead: {
        id: leadId,
        display_name: displayName,
      },
      counts,
      active_type: activeType,
      has_more: hasMore,
      next_cursor: nextCursor,
      kirtans: mapLeadKirtans(rows, harmoniumIds, rareGemIds),
      featured: mapFeaturedKirtan(featuredData, harmoniumIds, rareGemIds),
    };

    return {
      data,
      error: null,
      status: 200,
    };
  },
  ["lead-page-data-single"],
  {
    revalidate: 86400,
    tags: ["explore-leads-slugs", "rare-gems"],
  },
);

export async function getLeadPageData(slug: string): Promise<{
  data: LeadResponse | null;
  error: string | null;
  status: number;
}> {
  if (slug === OTHER_LEAD_SLUG) {
    return getCachedOtherLeadPageData();
  }

  // Resolve slug existence outside the cache so newly created or renamed leads
  // do not remain stuck behind a cached 404 in production.
  const { data: lead, error: leadError } = await supabase
    .from("lead_singers")
    .select("id, display_name")
    .eq("slug", slug)
    .maybeSingle();

  if (leadError || !lead) {
    return { data: null, error: "Lead singer not found", status: 404 };
  }

  return getCachedSingleLeadPageData(lead.id, lead.display_name);
}
