"use client";

import type { KirtanSummary } from "@/types/kirtan";
import HomeCuratedKirtanStrip from "@/lib/components/HomeCuratedKirtanStrip";

type HomePopularStripProps = {
  kirtans: KirtanSummary[];
};

export default function HomePopularStrip({ kirtans }: HomePopularStripProps) {
  return (
    <HomeCuratedKirtanStrip
      title="Popular"
      subtitle="Our most played tracks."
      kirtans={kirtans}
      backgroundGradient="linear-gradient(180deg, #5c7a3c 0%, #c3af81 18%, #ede8cb 54%, #f6efe4 100%)"
      headerOverlayRgb="78,43,24"
      headerOverlay={{ start: 0.14, middle: 0.04, end: 0 }}
      cardsOverlayRgb="255,249,243"
      cardsOverlay={{
        start: 0.06,
        middle: 0.02,
        end: 0,
        middlePosition: "24%",
      }}
    />
  );
}
