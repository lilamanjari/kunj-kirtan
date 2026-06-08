import { supabase } from "@/lib/supabase";
import type { KirtanSummary, PlayableBhajanTitleRow } from "@/types/kirtan";
import type { BhajanAlphabetIndex, BhajansResponse } from "@/types/bhajans";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { unstable_cache } from "next/cache";
import { buildBhajanAlphabetIndex } from "@/lib/server/bhajanAlphabet";
import { fetchBhajanLeadSingerImagesByKirtanId } from "@/lib/server/bhajanLeadImages";
import { fetchBhajanCollectionCounts } from "@/lib/server/bhajanCollections";

const getCachedBhajanAlphabetIndex = unstable_cache(
  async () => buildBhajanAlphabetIndex(null),
  ["bhajan-alphabet-index"],
  {
    revalidate: 86400,
    tags: ["explore-bhajans"],
  },
);

const getCachedBhajansPageData = unstable_cache(
  async () => {
    const featured = await getDailyRareGem({ types: ["BHJ"] });
    if (featured.error) {
      return { data: null, error: featured.error, status: 500 };
    }

    let alphabetIndex: BhajanAlphabetIndex;
    try {
      alphabetIndex = await getCachedBhajanAlphabetIndex();
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to build alphabet index",
        status: 500,
      };
    }

    const { data, error } = await supabase
      .from("playable_bhajan_titles")
      .select("*")
      .order("title", { ascending: true })
      .order("browse_id", { ascending: true })
      .limit(21);

    const { count: totalCount, error: countError } = await supabase
      .from("playable_bhajan_titles")
      .select("browse_id", { count: "exact", head: true });
    const { counts: collectionCounts, error: collectionCountsError } =
      await fetchBhajanCollectionCounts();

    if (error || countError || collectionCountsError || !collectionCounts) {
      return {
        data: null,
        error:
          error?.message ??
          countError?.message ??
          collectionCountsError ??
          "Failed to load bhajans",
        status: 500,
      };
    }

    const rows = ((data ?? []) as PlayableBhajanTitleRow[]).slice(0, 20);
    const hasMore = (data ?? []).length > 20;
    const last = rows[rows.length - 1];
    const nextCursor = hasMore && last
      ? { title: last.title, id: last.browse_id }
      : null;

    const ids = [...new Set(rows.map((k) => k.kirtan_id))];
    if (featured.kirtan?.id) {
      ids.unshift(featured.kirtan.id);
    }
    const { harmoniumIds, rareGemIds, error: tagError } =
      await fetchKirtanTagFlags(ids);
    const { imagesByKirtanId, error: imageError } =
      await fetchBhajanLeadSingerImagesByKirtanId(ids);

    if (tagError || imageError) {
      return { data: null, error: tagError ?? imageError ?? "Unknown error", status: 500 };
    }

    const bhajans: KirtanSummary[] = rows.map((k) => ({
      id: k.kirtan_id,
      browse_id: k.browse_id,
      audio_url: k.audio_url ?? "",
      type: k.type,
      title: k.title,
      lead_singer: k.lead_singer,
      lead_singer_image_url: imagesByKirtanId.get(k.kirtan_id)?.url ?? null,
      lead_singer_image_alt:
        imagesByKirtanId.get(k.kirtan_id)?.alt_text ?? k.lead_singer,
      recorded_date: k.recorded_date,
      recorded_date_precision: k.recorded_date_precision ?? null,
      sanga: k.sanga,
      duration_seconds: k.duration_seconds,
      sequence_num: k.sequence_num ?? null,
      has_harmonium: harmoniumIds.has(k.kirtan_id),
      is_rare_gem: rareGemIds.has(k.kirtan_id),
    }));

    const featuredKirtan: KirtanSummary | null = featured.kirtan
      ? {
          id: featured.kirtan.id,
          audio_url: featured.kirtan.audio_url ?? "",
          type: featured.kirtan.type,
          title: featured.kirtan.title,
          lead_singer: featured.kirtan.lead_singer,
          lead_singer_id: featured.kirtan.lead_singer_id ?? null,
          lead_singer_image_url:
            imagesByKirtanId.get(featured.kirtan.id)?.url ?? null,
          lead_singer_image_alt:
            imagesByKirtanId.get(featured.kirtan.id)?.alt_text ??
            featured.kirtan.lead_singer,
          recorded_date: featured.kirtan.recorded_date,
          recorded_date_precision: featured.kirtan.recorded_date_precision ?? null,
          sanga: featured.kirtan.sanga,
          duration_seconds: featured.kirtan.duration_seconds,
          sequence_num: featured.kirtan.sequence_num ?? null,
          has_harmonium: harmoniumIds.has(featured.kirtan.id),
          is_rare_gem: rareGemIds.has(featured.kirtan.id),
        }
      : null;

    return {
      data: {
        bhajans,
        total_count: totalCount ?? 0,
        collection_counts: collectionCounts,
        has_more: hasMore,
        has_before: false,
        next_cursor: nextCursor,
        prev_cursor: null,
        featured: featuredKirtan,
        alphabet_index: alphabetIndex,
      } satisfies BhajansResponse,
      error: null,
      status: 200,
    };
  },
  ["bhajans-page-data"],
  {
    revalidate: 86400,
    tags: ["explore-bhajans", "rare-gems"],
  },
);

export async function getBhajansPageData() {
  return getCachedBhajansPageData();
}
