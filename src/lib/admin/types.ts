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
  lead_singer_image_url: string | null;
  lead_singer_image_alt: string | null;
  lead_singer_image_focus_x: number | null;
  lead_singer_image_focus_y: number | null;
  duration_seconds: number | null;
  sequence_num: number | null;
};

export type AdminTagSummary = {
  id: string;
  name: string;
  slug: string;
  category: string;
  usage_count: number;
  published: boolean;
  browse_visible: boolean;
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
  lead_singer_image_url: string | null;
  lead_singer_image_alt: string | null;
  lead_singer_image_focus_x: number | null;
  lead_singer_image_focus_y: number | null;
  sanga: string | null;
  audio_url: string | null;
  audio_file_name: string | null;
  duration_seconds: number | null;
  sequence_num: number | null;
  titles: AdminKirtanTitle[];
  tags: AdminKirtanTag[];
};

export type AdminTagDetail = AdminTagSummary & {
  linked_kirtan_ids: string[];
};

export type AdminLeadSingerOption = {
  id: string;
  display_name: string;
};

export type AdminLeadSingerKirtanSummary = {
  id: string;
  title: string;
  type: KirtanType;
  published: boolean;
  recorded_date: string | null;
  recorded_date_precision: RecordedDatePrecision | null;
  duration_seconds: number | null;
  sequence_num: number | null;
};

export type AdminLeadSingerKirtanListState = {
  kirtans: AdminLeadSingerKirtanSummary[];
  total_count: number;
  has_more: boolean;
  next_offset: number | null;
};

export type AdminLeadSingerSummary = {
  id: string;
  canonical_name: string;
  display_name: string;
  slug: string;
  description: string | null;
  priority: number;
  is_identified: boolean;
  home_sanga_id: string | null;
  home_sanga_name: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_key: string | null;
  image_focus_x: number | null;
  image_focus_y: number | null;
  kirtan_count: number;
};

export type AdminLeadSingerDetail = AdminLeadSingerSummary & {
  kirtans: AdminLeadSingerKirtanSummary[];
  kirtans_total_count: number;
  kirtans_has_more: boolean;
  kirtans_next_offset: number | null;
};

export type AdminSangaOption = {
  id: string;
  name: string;
};

export type AdminSangaSummary = {
  id: string;
  name: string;
  kirtan_count: number;
  lead_singer_count: number;
  total_usage_count: number;
};

export type AdminSangaDetail = AdminSangaSummary & {
  linked_kirtan_ids: string[];
  linked_lead_singer_ids: string[];
};
