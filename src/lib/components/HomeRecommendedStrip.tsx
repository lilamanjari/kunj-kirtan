"use client";

import type { KirtanSummary } from "@/types/kirtan";
import HomeCuratedKirtanStrip from "@/lib/components/HomeCuratedKirtanStrip";

type HomeRecommendedStripProps = {
  kirtans: KirtanSummary[];
};

export default function HomeRecommendedStrip({
  kirtans,
}: HomeRecommendedStripProps) {
  return (
    <HomeCuratedKirtanStrip
      title="Recommended"
      subtitle="Rare gems refreshed weekly."
      kirtans={kirtans}
      backgroundGradient="linear-gradient(180deg, #b78c89 0%, #d2aaa1 18%, #f0d2c4 52%, #f7ebe2 100%)"
      headerOverlayRgb="91,58,28"
      headerOverlay={{ start: 0.16, middle: 0.05, end: 0 }}
      cardsOverlayRgb="255,250,242"
      cardsOverlay={{
        start: 0.07,
        middle: 0.03,
        end: 0,
        middlePosition: "24%",
      }}
    />
  );
}
