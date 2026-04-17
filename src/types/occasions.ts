import type { KirtanSummary } from "./kirtan";

export type OccasionPersonGroup = {
  person_name: string;
  kirtans: KirtanSummary[];
};

export type OccasionResponse = {
  tag: {
    id: string;
    name: string;
    slug: string;
  };
  featured?: KirtanSummary | null;
  kirtans: KirtanSummary[];
  person_groups?: OccasionPersonGroup[];
  ungrouped_kirtans?: KirtanSummary[];
};
