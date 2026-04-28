import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import type {
  KirtanSummary,
  PlayableKirtanRow,
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

class LeadPageNotFoundError extends Error {}

class LeadPageDataError extends Error {}

function isTransientFetchFailure(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("fetch failed");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function normalizeRecordedDatePrecision(
  value: string | null | undefined,
): RecordedDatePrecision | null {
  if (value === "day" || value === "month" || value === "year") {
    return value;
  }
  return null;
}

function mapFeaturedKirtan(
  featuredData: PlayableKirtanRow | null,
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
): KirtanSummary | null {
  if (!featuredData) return null;

  return {
    id: featuredData.id,
    audio_url: featuredData.audio_url ?? "",
    type: featuredData.type,
    title: formatKirtanTitle(
      featuredData.type,
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
  rows: PlayableKirtanRow[],
  harmoniumIds: Set<string>,
  rareGemIds: Set<string>,
): KirtanSummary[] {
  return rows.map((k) => ({
    id: k.id,
    audio_url: k.audio_url ?? "",
    type: k.type,
    title: formatKirtanTitle(k.type, k.title),
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
      throw new LeadPageDataError(directoryError);
    }

    if (otherLeadIds.length === 0) {
      throw new LeadPageNotFoundError("Lead singer not found");
    }

    const activeType = firstAvailableLeadType(otherCounts);
    const { kirtan: featuredData, error: featuredError } =
      await getDailyRareGem({ leadSingerIds: otherLeadIds });
    if (featuredError) {
      console.error("Lead page featured lookup failed for others:", featuredError);
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
      throw new LeadPageDataError(kirtanError);
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
      console.error("Lead page tag flag lookup failed for others:", tagError);
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
      kirtans: mapLeadKirtans(
        rows,
        tagError ? new Set() : harmoniumIds,
        tagError ? new Set() : rareGemIds,
      ),
      featured: mapFeaturedKirtan(
        featuredError ? null : featuredData,
        tagError ? new Set() : harmoniumIds,
        tagError ? new Set() : rareGemIds,
      ),
    };

    return data;
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
      throw new LeadPageDataError(countsError);
    }

    const activeType = firstAvailableLeadType(counts);
    const { kirtan: featuredData, error: featuredError } =
      await getDailyRareGem({ leadSingerId: leadId });

    if (featuredError) {
      console.error(`Lead page featured lookup failed for ${leadId}:`, featuredError);
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
      throw new LeadPageDataError(kirtanError);
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
      console.error(`Lead page tag flag lookup failed for ${leadId}:`, tagError);
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
      kirtans: mapLeadKirtans(
        rows,
        tagError ? new Set() : harmoniumIds,
        tagError ? new Set() : rareGemIds,
      ),
      featured: mapFeaturedKirtan(
        featuredError ? null : featuredData,
        tagError ? new Set() : harmoniumIds,
        tagError ? new Set() : rareGemIds,
      ),
    };

    return data;
  },
  ["lead-page-data-single"],
  {
    revalidate: 86400,
    tags: ["explore-leads-slugs", "rare-gems"],
  },
);

async function loadLeadPageData(slug: string): Promise<{
  data: LeadResponse | null;
  error: string | null;
  status: number;
}> {
  if (slug === OTHER_LEAD_SLUG) {
    try {
      const data = await getCachedOtherLeadPageData();
      return { data, error: null, status: 200 };
    } catch (error) {
      if (error instanceof LeadPageNotFoundError) {
        return { data: null, error: error.message, status: 404 };
      }
      throw error;
    }
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

  const data = await getCachedSingleLeadPageData(lead.id, lead.display_name);
  return { data, error: null, status: 200 };
}

export async function getLeadPageData(slug: string): Promise<{
  data: LeadResponse | null;
  error: string | null;
  status: number;
}> {
  try {
    return await loadLeadPageData(slug);
  } catch (error) {
    console.error(`Lead page load failed for slug="${slug}" on first attempt:`, error);

    if (isTransientFetchFailure(error)) {
      try {
        return await loadLeadPageData(slug);
      } catch (retryError) {
        console.error(
          `Lead page load failed for slug="${slug}" on retry:`,
          retryError,
        );
        return {
          data: null,
          error: "Temporary network issue while loading this lead page.",
          status: 500,
        };
      }
    }

    return {
      data: null,
      error: errorMessage(error),
      status: 500,
    };
  }
}
