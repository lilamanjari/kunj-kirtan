// src/types/home.ts
import type { KirtanSummary } from "./kirtan";

export type HomeData = {
  primary_action: {
    type: string;
    kirtan: KirtanSummary;
  } | null;

  continue_listening: KirtanSummary | null;

  entry_points: { id: string; label: string }[];

  recently_added: KirtanSummary[];
};
