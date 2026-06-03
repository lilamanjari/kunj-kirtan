"use client";

import { Suspense, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { HomeData } from "@/types/home";
import type { KirtanSummary } from "@/types/kirtan";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import HomeFavoritesStrip from "@/lib/components/HomeFavoritesStrip";
import HomePopularStrip from "@/lib/components/HomePopularStrip";
import HomeRecommendedStrip from "@/lib/components/HomeRecommendedStrip";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import SharedKirtanFeature from "@/lib/components/SharedKirtanFeature";
import {
  greenSurfaceTheme,
  homePalette,
} from "@/lib/theme/pagePalettes";
import { radiusClassNames } from "@/lib/theme/radii";
import Image from "next/image";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

const exploreTileStyles: Record<
  string,
  {
    backgroundImage: string;
    overlay: string;
    accent: string;
    title: string;
  }
> = {
  MM: {
    backgroundImage: "none", //"url('/Popular-background-2.jpg')",
    overlay:
      "linear-gradient(145deg, rgba(255,251,246,0.94) 0%, rgba(252,243,236,0.92) 56%, rgba(222,199,194,0.9) 100%)",
    accent: "rgba(230, 213, 209, 0.32)",
    title: "",
  },
  BHJ: {
    backgroundImage: "none", //"url('/Favorites Background.jpeg')",
    overlay:
      "linear-gradient(145deg, rgba(255, 250, 246,0.94) 0%, rgba(241,231,213,0.92) 56%, rgba(187,137,45,0.4) 100%)",
    accent: "rgba(235, 220, 192, 0.34)",
    title: "",
  },
  LEADS: {
    backgroundImage: "none", //"url('/Favorites Background.jpeg')",
    overlay:
      "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(253,243,218,0.72) 56%, rgba(245,196,72,0.5) 100%)",
    accent: "rgba(253, 243, 218, 0.34)",
    title: "",
  },
  OCCASIONS: {
    backgroundImage: "none", //"url('/Popular-background-2.jpg')",
    overlay:
      "linear-gradient(145deg, rgba(250,236,236,0.75) 0%, rgba(253,243,218,0.5) 56%, rgba(206,69,69,0.2) 100%)",
    accent: "rgba(245, 218, 218, 0.32)",
    title: "",
  },
};

export default function HomeClient({ data }: { data: HomeData }) {
  const dictionary = useDictionary();
  const {
    isPlaying,
    isLoading,
    isActive,
    toggle,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
    favorites,
    favoritesLoaded,
    select,
  } = useAudioPlayer();
  const primaryAction = data.primary_action;
  const recentlyAdded = data.recently_added ?? [];
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedKirtan, setSharedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedCardDismissed, setSharedCardDismissed] = useState(false);
  const entryPointLinks: Record<string, string> = {
    MM: "/explore/maha-mantras",
    BHJ: "/explore/bhajans",
    LEADS: "/explore/leads",
    OCCASIONS: "/explore/occasions",
  };
  const renderedRecentlyAdded = pinnedKirtan
    ? [pinnedKirtan, ...recentlyAdded.filter((k) => k.id !== pinnedKirtan.id)]
    : recentlyAdded;
  const shouldHidePrimaryFeatured =
    !!sharedKirtan &&
    !sharedCardDismissed &&
    sharedKirtan.id === primaryAction?.kirtan.id;
  const entryPointTitles: Record<string, string> = {
    MM: dictionary.explore.mahaMantra,
    BHJ: dictionary.explore.bhajans,
    LEADS: dictionary.explore.leadSingers,
    OCCASIONS: dictionary.explore.occasions,
  };
  function handleSharedKirtan(kirtan: KirtanSummary) {
    setPinnedKirtan(kirtan);
    setSharedKirtan(kirtan);
    setSharedCardDismissed(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md space-y-6">
        <div className="relative">
          <Image
            src="/KunjKirtan-SrilaGurudeva-Header.jpeg"
            alt="Kunj Kirtan header artwork"
            width={1200}
            height={520}
            priority
            className="h-auto w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-[#f2cdc4]/42 via-55% to-[#f6e4de]" />
        </div>
        <div className="px-5 space-y-8 -mt-12">
          <Suspense fallback={null}>
            <KirtanDeepLinkHandler
              kirtans={recentlyAdded}
              onSelect={select}
              isActive={isActive}
              onPin={handleSharedKirtan}
            />
          </Suspense>
          <SharedKirtanFeature
            kirtan={sharedKirtan}
            isActive={sharedKirtan ? isActive(sharedKirtan) : false}
            isPlaying={sharedKirtan ? isPlaying(sharedKirtan) : false}
            isLoading={sharedKirtan ? isLoading(sharedKirtan) : false}
            onToggle={() => {
              if (sharedKirtan) toggle(sharedKirtan);
            }}
            onEnqueue={enqueue}
            onDequeue={dequeueById}
            isQueued={sharedKirtan ? isQueued(sharedKirtan.id) : false}
            onToggleFavorite={toggleFavorite}
            isFavorited={sharedKirtan ? isFavorited(sharedKirtan.id) : false}
            onDismissedChange={setSharedCardDismissed}
          />
          {primaryAction && !shouldHidePrimaryFeatured && (
            <FeaturedKirtanCard
              kirtan={primaryAction.kirtan}
              isActive={isActive(primaryAction.kirtan)}
              isPlaying={isPlaying(primaryAction.kirtan)}
              isLoading={isLoading(primaryAction.kirtan)}
              onToggle={() => toggle(primaryAction.kirtan)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(primaryAction.kirtan.id)}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(primaryAction.kirtan.id)}
              palette={homePalette.featuredCard}
            />
          )}

          <section>
            <h2 className="px-5 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              {dictionary.common.discover}
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {data.entry_points?.map((e) => {
                const href = entryPointLinks[e.id];
                const tileStyle = exploreTileStyles[e.id];

                if (href) {
                  return (
                    <LocalizedLink
                      key={e.id}
                      href={href}
                      className={`group relative flex min-h-[8.75rem] items-center justify-center overflow-hidden border px-4 py-4 text-center shadow-[0_12px_28px_rgba(156,113,93,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(156,113,93,0.16)] ${radiusClassNames.tile}`}
                      style={{
                        backgroundImage: `${tileStyle?.overlay ?? "linear-gradient(180deg, rgba(255,250,246,0.9) 0%, rgba(247,239,235,0.86) 100%)"}, ${tileStyle?.backgroundImage ?? "none"}`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        borderColor:
                          tileStyle?.accent ?? "rgba(214, 185, 170, 0.38)",
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-90 transition group-hover:opacity-100"
                        style={{
                          background:
                            "radial-gradient(circle at top, rgba(255,255,255,0.3), transparent 45%)",
                        }}
                      />

                      <span className="relative max-w-[8ch] text-[1.48rem] font-semibold leading-[1.05] text-[#5a443d]">
                        {entryPointTitles[e.id] ?? tileStyle?.title ?? e.label}
                      </span>
                    </LocalizedLink>
                  );
                }

                return (
                  <button
                    key={e.id}
                    disabled
                    className={`flex min-h-[8.75rem] items-center justify-center border border-[#e6d4cc] bg-white/75 px-4 py-4 text-center text-[1.48rem] font-semibold text-[#9d8a84] ${radiusClassNames.tile}`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </section>

          {data.current_occasion ? (
            <section className="relative">
              <LocalizedLink
                href={`/explore/occasions/${data.current_occasion.slug}`}
                className={`group block border border-[#cfe0c6] p-6 text-[#4f5f45] shadow-[0_20px_42px_rgba(116,148,98,0.18)] backdrop-blur-sm transition hover:-translate-y-0.5 ${radiusClassNames.surface}`}
                style={{
                  backgroundColor: greenSurfaceTheme.backgroundColor,
                  backgroundImage: greenSurfaceTheme.gradient,
                  borderColor: greenSurfaceTheme.borderColor,
                  boxShadow: `0 20px 42px ${greenSurfaceTheme.shadowColor}`,
                  color: greenSurfaceTheme.textColor,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-xs font-semibold uppercase tracking-[0.16em] ${greenSurfaceTheme.labelClassName}`}
                    >
                      {data.current_occasion.header ??
                        dictionary.home.currentVrata}
                    </p>
                    <p
                      className={`mt-2 text-sm font-medium ${greenSurfaceTheme.contextClassName}`}
                    >
                      {data.current_occasion.subtitle ??
                        dictionary.home.currentVrataSubtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[1.9rem] font-semibold leading-[1.05] text-[#445643]">
                      {data.current_occasion.name}
                    </h2>
                  </div>
                  <span
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-white/88 text-xl backdrop-blur-sm transition group-hover:translate-x-0.5"
                    style={{
                      borderColor: greenSurfaceTheme.buttonBorderColor,
                      color: greenSurfaceTheme.buttonTextColor,
                      boxShadow: `0 8px 18px ${greenSurfaceTheme.buttonShadowColor}`,
                    }}
                  >
                    →
                  </span>
                </div>
              </LocalizedLink>
            </section>
          ) : null}

          <div className="space-y-0">
            <HomeFavoritesStrip
              favorites={favorites}
              loaded={favoritesLoaded}
            />
            <HomeRecommendedStrip kirtans={data.recommended ?? []} />
            <HomePopularStrip kirtans={data.popular ?? []} />
          </div>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              {dictionary.common.recentlyAdded}
            </h2>

            <ul className="mt-3 space-y-3">
              {renderedRecentlyAdded.map((k) => {
                return (
                  <KirtanListItem
                    key={k.id}
                    kirtan={k}
                    isActive={isActive(k)}
                    isPlaying={isPlaying(k)}
                    isLoading={isLoading(k)}
                    onToggle={() => toggle(k)}
                    onEnqueue={enqueue}
                    onDequeue={dequeueById}
                    isQueued={isQueued(k.id)}
                    onToggleFavorite={toggleFavorite}
                    isFavorited={isFavorited(k.id)}
                  />
                );
              })}
            </ul>
          </section>

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
