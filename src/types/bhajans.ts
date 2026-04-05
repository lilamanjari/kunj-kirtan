import type { KirtanSummary } from "./kirtan";

export type BhajansResponse = {
  bhajans: KirtanSummary[];
  has_more: boolean;
  next_cursor: {
    title: string;
    id: string;
  } | null;
  featured: KirtanSummary | null;
};
