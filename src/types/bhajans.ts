import type { KirtanSummary } from "./kirtan";
import type { BhajanCollectionCounts } from "@/lib/server/bhajanCollections";

export type BhajanCursor = {
  title: string;
  id: string;
};

export type BhajanAlphabetIndex = Partial<Record<string, BhajanCursor>>;

export type BhajansResponse = {
  bhajans: KirtanSummary[];
  total_count?: number;
  collection_counts?: BhajanCollectionCounts;
  has_more: boolean;
  has_before?: boolean;
  next_cursor: BhajanCursor | null;
  prev_cursor?: BhajanCursor | null;
  featured: KirtanSummary | null;
  alphabet_index?: BhajanAlphabetIndex;
};
