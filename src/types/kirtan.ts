export type KirtanType = "MM" | "BHJ" | "HK";
export type RecordedDatePrecision = "day" | "month" | "year";

export type PlayableKirtanRow = {
  id: string;
  audio_url: string | null;
  type: KirtanType;
  title: string;
  display_title?: string | null;
  official_title?: string | null;
  first_line_title?: string | null;
  lead_singer: string | null;
  lead_singer_id?: string | null;
  recorded_date: string | null;
  recorded_date_precision?: RecordedDatePrecision | null;
  sanga: string;
  duration_seconds?: number | null;
  sequence_num?: number | null;
};

export type KirtanSummary = {
  id: string;
  audio_url: string;
  type: KirtanType;
  title: string;
  lead_singer: string | null;
  recorded_date: string | null;
  recorded_date_precision?: RecordedDatePrecision | null;
  sanga: string;
  duration_seconds?: number | null;
  sequence_num?: number | null;
  has_harmonium?: boolean;
  is_rare_gem?: boolean;
  person_tag?: string | null;
};

export type PlayableBhajanTitleRow = {
  browse_id: string;
  kirtan_id: string;
  title: string;
  title_kind?: "first_line" | "official" | "alternate" | null;
  normalized_title?: string | null;
  searchable_text?: string | null;
  companion_title?: string | null;
  companion_title_kind?: "first_line" | "official" | "alternate" | null;
  audio_url: string | null;
  type: KirtanType;
  lead_singer: string | null;
  recorded_date: string | null;
  recorded_date_precision?: RecordedDatePrecision | null;
  sanga: string;
  duration_seconds?: number | null;
  sequence_num?: number | null;
};
