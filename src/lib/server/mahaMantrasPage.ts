import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { KirtanSummary } from "@/types/kirtan";
import { fetchKirtanTagFlags } from "@/lib/server/kirtanTags";
import { getDailyRareGem } from "@/lib/server/featured";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { MahaMantrasResponse } from "@/app/explore/maha-mantras/types";

const getCachedMahaMantrasPageData = unstable_cache(
  async () => {
    const featured = await getDailyRareGem({ type: "MM" });
    if (featured.error) {
      return { data: null, error: featured.error, status: 500 };
    }

    const { data, error } = await supabase
      .from("playable_kirtans")
      .select(
        "id, audio_url, type, title, lead_singer, recorded_date, recorded_date_precision, sanga, duration_seconds, created_at, sequence_num",
      )
      .eq("type", "MM")
      .order("recorded_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(21);

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const rows = data ?? [];
    const hasMore = rows.length > 20;
    const page = hasMore ? rows.slice(0, 20) : rows;
    const last = page[page.length - 1];

    const ids = page.map((k) => k.id);
    if (featured.kirtan?.id) {
      ids.unshift(featured.kirtan.id);
    }
    const { harmoniumIds, rareGemIds, error: tagError } =
      await fetchKirtanTagFlags(ids);

    if (tagError) {
      return { data: null, error: tagError, status: 500 };
    }

    const mantras: KirtanSummary[] = page.map((k) => ({
      id: k.id,
      audio_url: k.audio_url,
      type: "MM",
      title: formatKirtanTitle("MM", k.title),
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
          type: "MM",
          title: formatKirtanTitle("MM", featured.kirtan.title),
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
        mantras,
        has_more: hasMore,
        next_cursor: last
          ? { recorded_date: last.recorded_date, id: last.id }
          : null,
        featured: featuredKirtan,
      } satisfies MahaMantrasResponse,
      error: null,
      status: 200,
    };
  },
  ["maha-mantras-page-data"],
  {
    revalidate: 86400,
    tags: ["explore-maha-mantras", "rare-gems"],
  },
);

export async function getMahaMantrasPageData() {
  return getCachedMahaMantrasPageData();
}
