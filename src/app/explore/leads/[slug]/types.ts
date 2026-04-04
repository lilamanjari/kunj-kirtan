import type { KirtanSummary, KirtanType } from "@/types/kirtan";

export type LeadCounts = Record<KirtanType, number>;

export type LeadCursor =
  | { title: string; id: string }
  | { recorded_date: string | null; id: string }
  | null;

export type LeadResponse = {
  lead: {
    id: string;
    display_name: string;
  };
  counts: LeadCounts;
  active_type: KirtanType | null;
  has_more: boolean;
  next_cursor: LeadCursor;
  kirtans: KirtanSummary[];
  featured?: KirtanSummary | null;
};

export type LeadListState = {
  kirtans: KirtanSummary[];
  has_more: boolean;
  next_cursor: LeadCursor;
};
