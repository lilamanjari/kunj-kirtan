// Cached server loader for the initial Maha Mantra page payload.
// This powers SSR for the first page load and caches the default first-page query.
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { PlayableKirtanRow } from "@/types/kirtan";
import { getDailyRareGem } from "@/lib/server/featured";
import { fetchMahaMantraCollectionCounts } from "@/lib/server/mahaMantraCollections";
import { buildMahaMantraPresentation } from "@/lib/server/mahaMantraPresentation";
import type { MahaMantrasResponse } from "@/types/maha-mantras";

const getCachedMahaMantrasPageData = unstable_cache(
  async () => {
    const featured = await getDailyRareGem({ types: ["MM"] });
    if (featured.error) {
      return { data: null, error: featured.error, status: 500 };
    }

    const { count: totalCount, error: totalCountError } = await supabase
      .from("playable_kirtans")
      .select("id", { count: "exact", head: true })
      .eq("type", "MM");

    if (totalCountError) {
      return { data: null, error: totalCountError.message, status: 500 };
    }

    const { counts: collectionCounts, error: collectionCountsError } =
      await fetchMahaMantraCollectionCounts();

    if (collectionCountsError || !collectionCounts) {
      return {
        data: null,
        error: collectionCountsError ?? "Failed to load collection counts",
        status: 500,
      };
    }

    const { data, error } = await supabase
      .from("playable_kirtans")
      .select(
        "id, audio_url, type, title, lead_singer, lead_singer_id, recorded_date, recorded_date_precision, sanga, duration_seconds, created_at, sequence_num",
      )
      .eq("type", "MM")
      .order("recorded_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(21);

    if (error) {
      return { data: null, error: error.message, status: 500 };
    }

    const rows: PlayableKirtanRow[] = data ?? [];
    const hasMore = rows.length > 20;
    const page = hasMore ? rows.slice(0, 20) : rows;
    const last = page[page.length - 1];

    const {
      mantras,
      featuredKirtan,
      error: presentationError,
    } = await buildMahaMantraPresentation(page, featured.kirtan);

    if (presentationError) {
      return { data: null, error: presentationError, status: 500 };
    }

    return {
      data: {
        mantras,
        total_count: totalCount ?? mantras.length,
        collection_counts: collectionCounts,
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
