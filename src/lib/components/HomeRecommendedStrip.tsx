"use client";

import type { KirtanSummary } from "@/types/kirtan";
import HomeCuratedKirtanStrip from "@/lib/components/HomeCuratedKirtanStrip";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

type HomeRecommendedStripProps = {
  kirtans: KirtanSummary[];
};

export default function HomeRecommendedStrip({
  kirtans,
}: HomeRecommendedStripProps) {
  const dictionary = useDictionary();

  return (
    <HomeCuratedKirtanStrip
      title={dictionary.home.recommended}
      subtitle={dictionary.home.recommendedSubtitle}
      kirtans={kirtans}
      backgroundGradient="linear-gradient(180deg, #d49897 0%, #d6afa4 18%, #f0d2c4 52%, #f7ebe2 100%)"
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
