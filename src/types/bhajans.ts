import type { KirtanSummary } from "./kirtan";

export type BhajanCursor = {
  title: string;
  id: string;
};

export type BhajanAlphabetIndex = Partial<Record<string, BhajanCursor>>;

export type BhajansResponse = {
  bhajans: KirtanSummary[];
  has_more: boolean;
  has_before?: boolean;
  next_cursor: BhajanCursor | null;
  prev_cursor?: BhajanCursor | null;
  featured: KirtanSummary | null;
  alphabet_index?: BhajanAlphabetIndex;
};
