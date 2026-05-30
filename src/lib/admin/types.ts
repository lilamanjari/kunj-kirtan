import type { KirtanType, RecordedDatePrecision } from "@/types/kirtan";

export type AdminKirtanListItem = {
  id: string;
  title: string;
  type: KirtanType;
  published: boolean;
  created_at: string | null;
  recorded_date: string | null;
  recorded_date_precision: RecordedDatePrecision | null;
  lead_singer: string | null;
  duration_seconds: number | null;
};

export type AdminTagSummary = {
  id: string;
  name: string;
  slug: string;
  category: string;
  usage_count: number;
};

export type AdminKirtanTag = {
  id: string;
  name: string;
  slug: string;
  category: string;
};

export type AdminKirtanTitle = {
  kind: "first_line" | "official";
  title: string;
};

export type AdminKirtanDetail = {
  id: string;
  title: string;
  display_title: string;
  type: KirtanType;
  published: boolean;
  created_at: string | null;
  recorded_date: string | null;
  recorded_date_precision: RecordedDatePrecision | null;
  lead_singer: string | null;
  lead_singer_id: string | null;
  sanga: string | null;
  titles: AdminKirtanTitle[];
  tags: AdminKirtanTag[];
};

export type AdminTagDetail = AdminTagSummary & {
  linked_kirtan_ids: string[];
};
