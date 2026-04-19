import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import type { BhajansResponse } from "@/types/bhajans";

const getCachedBhajansPageData = unstable_cache(
  async () => {
    const featured = await getDailyRareGem({ types: ["BHJ"] });
    if (featured.error) {
      return { data: null, error: featured.error, status: 500 };
    }

    const { data, error } = await supabase
      .from("playable_kirtans")
      .select("*")
      .eq("type", "BHJ")
      .order("title", { ascending: true })
      .order("id", { ascending: true })
      .limit(21);

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const rows = (data ?? []).slice(0, 20);
    const hasMore = (data ?? []).length > 20;
    const last = rows[rows.length - 1];
    const nextCursor = hasMore && last
      ? { title: last.title, id: last.id }
      : null;

    const ids = rows.map((k) => k.id);
    if (featured.kirtan?.id) {
      ids.unshift(featured.kirtan.id);
    }
    const { harmoniumIds, rareGemIds, error: tagError } =
      await fetchKirtanTagFlags(ids);

    if (tagError) {
      return { data: null, error: tagError, status: 500 };
    }

    const bhajans: KirtanSummary[] = rows.map((k) => ({
      id: k.id,
      audio_url: k.audio_url,
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
          audio_url: featured.kirtan.audio_url,
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

    return {
      data: {
        bhajans,
        has_more: hasMore,
        next_cursor: nextCursor,
        featured: featuredKirtan,
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
