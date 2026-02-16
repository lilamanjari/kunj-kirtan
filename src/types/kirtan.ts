export type KirtanType = "MM" | "BHJ";
export type RecordedDatePrecision = "day" | "month" | "year";

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
};
