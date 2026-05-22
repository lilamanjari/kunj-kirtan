import type { KirtanSummary } from "./kirtan";

export type OccasionResponse = {
  tag: {
    id: string;
    name: string;
    slug: string;
  };
  featured?: KirtanSummary | null;
  kirtans: KirtanSummary[];
};
