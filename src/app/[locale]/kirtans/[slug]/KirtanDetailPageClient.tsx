"use client";

import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import HomeCuratedKirtanStrip from "@/lib/components/HomeCuratedKirtanStrip";
import LocalizedLink from "@/lib/components/LocalizedLink";
import SubpageHeader from "@/lib/components/SubpageHeader";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { useDictionary, useLocale } from "@/lib/i18n/LocaleProvider";
import { radiusClassNames } from "@/lib/theme/radii";
import { homePalette } from "@/lib/theme/pagePalettes";
import type { PublicKirtanPageData } from "@/lib/server/kirtanPage";

type KirtanDetailPageClientProps = {
  data: PublicKirtanPageData;
};

function getMoreByTitle(locale: string, leadSingerName: string | null) {
  if (locale === "ru") {
    return leadSingerName ? `Еще от ${leadSingerName}` : "Еще киртаны";
  }

  return leadSingerName ? `More by ${leadSingerName}` : "More kirtans";
}

export default function KirtanDetailPageClient({
  data,
}: KirtanDetailPageClientProps) {
  const locale = useLocale();
  const dictionary = useDictionary();
  const {
    play,
    isActive,
    isPlaying,
    isLoading,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
  } = useAudioPlayer();

  const current = data.kirtan;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6">
        <SubpageHeader />

        <div className="-mt-1 space-y-6 pb-6">
          <FeaturedKirtanCard
            kirtan={current}
            isActive={isActive(current)}
            isPlaying={isPlaying(current)}
            isLoading={isLoading(current)}
            onToggle={() => play(current)}
            onEnqueue={enqueue}
            onDequeue={dequeueById}
            isQueued={isQueued(current.id)}
            onToggleFavorite={toggleFavorite}
            isFavorited={isFavorited(current.id)}
            label=""
            palette={homePalette.featuredCard}
          />

          {data.moreByLeadSinger.length > 0 ? (
            <HomeCuratedKirtanStrip
              title={getMoreByTitle(locale, current.lead_singer)}
              kirtans={data.moreByLeadSinger}
            />
          ) : null}

          <HomeCuratedKirtanStrip
            title={dictionary.home.recommended}
            kirtans={data.featuredKirtans}
          />

          <HomeCuratedKirtanStrip
            title={dictionary.home.popular}
            kirtans={data.popularKirtans}
          />

          <section className="pb-5 text-center">
            <LocalizedLink
              href="/about"
              className={`mt-3 inline-flex border border-white/70 bg-white/78 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b6a5f] shadow-sm backdrop-blur-sm transition hover:bg-white ${radiusClassNames.button}`}
            >
              {dictionary.common.aboutKunjKirtan}
            </LocalizedLink>
          </section>
        </div>
      </main>
    </div>
  );
}
