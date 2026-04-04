import type { KirtanSummary } from "@/types/kirtan";

export type OccasionResponse = {
  tag: {
    id: string;
    name: string;
    slug: string;
  };
  kirtans: KirtanSummary[];
};
