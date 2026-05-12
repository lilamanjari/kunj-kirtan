"use client";

import Image from "next/image";
import Link from "next/link";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import {
  formatKirtanDuration,
} from "@/lib/kirtanPresentation";
import type { KirtanSummary } from "@/types/kirtan";
import HomeRailKirtanCard from "@/lib/components/HomeRailKirtanCard";
import HomeRailActionButtons from "@/lib/components/HomeRailActionButtons";

type HomeFavoritesStripProps = {
  favorites: KirtanSummary[];
  loaded: boolean;
};

const FAVORITES_BG_IMAGE_OPACITY = 1;
const FAVORITES_HEADER_OVERLAY = {
  start: 0.62,
  middle: 0.34,
  end: 0,
};
const FAVORITES_CARDS_OVERLAY = {
  start: 0,
  middle: 0,
  end: 0,
};

export default function HomeFavoritesStrip({
  favorites,
  loaded,
}: HomeFavoritesStripProps) {
  const {
    play,
    isActive,
    isPlaying,
    isLoading,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
  } = useAudioPlayer();

  if (!loaded || favorites.length === 0) {
    return null;
  }

  const previewFavorites = favorites.slice(0, 4);

  return (
    <section className="relative -mx-5 px-5 py-5">
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/Favorites Background.jpeg"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 480px"
          className="object-cover object-[38%_22%]"
          style={{ opacity: FAVORITES_BG_IMAGE_OPACITY }}
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28"
        style={{
          background: `linear-gradient(180deg, rgba(49,28,35,${FAVORITES_HEADER_OVERLAY.start}) 0%, rgba(49,28,35,${FAVORITES_HEADER_OVERLAY.middle}) 55%, rgba(49,28,35,${FAVORITES_HEADER_OVERLAY.end}) 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 top-20"
        style={{
          background: `linear-gradient(180deg, rgba(255,248,245,${FAVORITES_CARDS_OVERLAY.start}) 0%, rgba(255,250,248,${FAVORITES_CARDS_OVERLAY.middle}) 24%, rgba(255,252,250,${FAVORITES_CARDS_OVERLAY.end}) 100%)`,
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/92">
            Favorites
          </h2>
          <p className="mt-1 text-sm text-white/82">
            Your saved kirtans, ready to play.
          </p>
        </div>
        <div className="shrink-0">
          <Link
            href="/favorites"
            className="rounded-full border border-rose-200/90 bg-white/88 px-3 py-1.5 text-xs font-medium text-[#9b5e52] shadow-sm transition hover:bg-rose-50"
          >
            View all
          </Link>
        </div>
      </div>

      <div className="relative mt-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 overflow-y-visible py-1 pr-8">
          {previewFavorites.map((kirtan) => {
            const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
            const active = isActive(kirtan);
            const queued = isQueued(kirtan.id);

            return (
              <HomeRailKirtanCard
                key={kirtan.id}
                kirtan={kirtan}
                isActive={active}
                isPlaying={isPlaying()}
                isLoading={isLoading()}
                onActivate={() => play(kirtan)}
                opacity={0.85}
                leadingSlot={
                  <HomeRailActionButtons
                    kirtan={kirtan}
                    isFavorited={true}
                    isQueued={queued}
                    onToggleFavorite={toggleFavorite}
                    onToggleQueue={(item) => {
                      if (queued) {
                        dequeueById(item.id);
                        return;
                      }
                      enqueue(item);
                    }}
                    showFilledHeart
                  />
                }
                trailingTopSlot={
                  <>
                    {kirtan.has_harmonium ? (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        H
                      </span>
                    ) : null}
                    {durationLabel ? (
                      <span className="rounded-full bg-[#e8f6ef] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#2e8c6f]">
                        {durationLabel}
                      </span>
                    ) : null}
                  </>
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
