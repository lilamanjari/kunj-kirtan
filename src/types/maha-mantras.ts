import type { KirtanSummary } from "./kirtan";
import type { MahaMantraCollectionCounts } from "@/lib/server/mahaMantraCollections";

export type MahaMantrasResponse = {
  mantras: KirtanSummary[];
  total_count: number;
  collection_counts: MahaMantraCollectionCounts;
  has_more: boolean;
  next_cursor: {
    recorded_date: string | null;
    id: string;
  } | null;
  featured: KirtanSummary | null;
};
