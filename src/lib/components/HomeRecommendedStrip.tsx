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
      kirtans={kirtans}
    />
  );
}
