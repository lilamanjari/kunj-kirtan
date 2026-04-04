import type { KirtanSummary } from "@/types/kirtan";

export type MahaMantrasResponse = {
  mantras: KirtanSummary[];
  has_more: boolean;
  next_cursor: {
    recorded_date: string | null;
    id: string;
  } | null;
  featured: KirtanSummary | null;
};
