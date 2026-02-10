export type KirtanType = "MM" | "BHJ";

export type KirtanSummary = {
  id: string;
  audio_url: string;
  type: KirtanType;
  title: string;
  lead_singer: string | null;
  recorded_date: string;
  sanga: string;
  duration_seconds?: number | null;
};
