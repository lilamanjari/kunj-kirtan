"use client";

import type { KirtanSummary } from "@/types/kirtan";
import HomeCuratedKirtanStrip from "@/lib/components/HomeCuratedKirtanStrip";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

type HomePopularStripProps = {
  kirtans: KirtanSummary[];
};

export default function HomePopularStrip({ kirtans }: HomePopularStripProps) {
  const dictionary = useDictionary();

  return (
    <HomeCuratedKirtanStrip title={dictionary.home.popular} kirtans={kirtans} />
  );
}
