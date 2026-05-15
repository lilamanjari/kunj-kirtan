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
import { homePalette } from "@/lib/theme/pagePalettes";
import Link from "next/link";
import Image from "next/image";

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
    title: "Maha Mantra",
  },
  BHJ: {
    backgroundImage: "none", //"url('/Favorites Background.jpeg')",
    overlay:
      "linear-gradient(145deg, rgba(255, 250, 246,0.94) 0%, rgba(241,231,213,0.92) 56%, rgba(187,137,45,0.4) 100%)",
    accent: "rgba(235, 220, 192, 0.34)",
    title: "Bhajans",
  },
  LEADS: {
    backgroundImage: "none", //"url('/Favorites Background.jpeg')",
    overlay:
      "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(253,243,218,0.72) 56%, rgba(245,196,72,0.5) 100%)",
    accent: "rgba(253, 243, 218, 0.34)",
    title: "Lead Singers",
  },
  OCCASIONS: {
    backgroundImage: "none", //"url('/Popular-background-2.jpg')",
    overlay:
      "linear-gradient(145deg, rgba(250,236,236,0.75) 0%, rgba(253,243,218,0.5) 56%, rgba(206,69,69,0.2) 100%)",
    accent: "rgba(245, 218, 218, 0.32)",
    title: "Occasions",
  },
};

export default function HomeClient({ data }: { data: HomeData }) {
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
  const [recentlyAdded] = useState(() => data.recently_added ?? []);
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const entryPointLinks: Record<string, string> = {
    MM: "/explore/maha-mantras",
    BHJ: "/explore/bhajans",
    LEADS: "/explore/leads",
    OCCASIONS: "/explore/occasions",
  };
  const renderedRecentlyAdded = pinnedKirtan
    ? [pinnedKirtan, ...recentlyAdded.filter((k) => k.id !== pinnedKirtan.id)]
    : recentlyAdded;

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
              onPin={setPinnedKirtan}
            />
          </Suspense>
          {primaryAction && (
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
              Discover
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {data.entry_points?.map((e) => {
                const href = entryPointLinks[e.id];
                const tileStyle = exploreTileStyles[e.id];

                if (href) {
                  return (
                    <Link
                      key={e.id}
                      href={href}
                      className="group relative flex min-h-[8.75rem] items-center justify-center overflow-hidden rounded-[1.3rem] border px-4 py-4 text-center shadow-[0_12px_28px_rgba(156,113,93,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(156,113,93,0.16)]"
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
                        {tileStyle?.title ?? e.label}
                      </span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={e.id}
                    disabled
                    className="flex min-h-[8.75rem] items-center justify-center rounded-[1.3rem] border border-[#e6d4cc] bg-white/75 px-4 py-4 text-center text-[1.48rem] font-semibold text-[#9d8a84]"
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </section>

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
              Recently Added
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
            <Link
              href="/about"
              className="mt-3 inline-flex rounded-md border border-white/70 bg-white/78 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b6a5f] shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              About Kunj Kirtan
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
