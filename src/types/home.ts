// src/types/home.ts
import type { KirtanSummary } from "./kirtan";

export type HomeData = {
  primary_action: {
    type: string;
    kirtan: KirtanSummary;
  } | null;

  current_occasion: {
    id: string;
    name: string;
    slug: string;
    header: string | null;
    subtitle: string | null;
  } | null;

  entry_points: { id: string; label: string }[];

  popular: KirtanSummary[];

  recommended: KirtanSummary[];

  recently_added: KirtanSummary[];
};
