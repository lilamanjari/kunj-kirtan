"use client";

import type { KirtanSummary } from "@/types/kirtan";
import HomeCuratedKirtanStrip from "@/lib/components/HomeCuratedKirtanStrip";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

type HomeNewThisWeekStripProps = {
  kirtans: KirtanSummary[];
};

export default function HomeNewThisWeekStrip({
  kirtans,
}: HomeNewThisWeekStripProps) {
  const dictionary = useDictionary();

  if (kirtans.length < 3) {
    return null;
  }

  return (
    <HomeCuratedKirtanStrip
      title={dictionary.home.newThisWeek}
      kirtans={kirtans}
    />
  );
}
