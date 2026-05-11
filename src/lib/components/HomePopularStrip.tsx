"use client";

import Image from "next/image";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import {
  formatKirtanDuration,
} from "@/lib/kirtanPresentation";
import type { KirtanSummary } from "@/types/kirtan";
import HomeRailKirtanCard from "@/lib/components/HomeRailKirtanCard";
import HomeRailActionButtons from "@/lib/components/HomeRailActionButtons";

type HomePopularStripProps = {
  kirtans: KirtanSummary[];
};

const POPULAR_BG_IMAGE_OPACITY = 1;
const POPULAR_HEADER_OVERLAY = {
  start: 0.46,
  middle: 0.22,
  end: 0,
};
const POPULAR_CARDS_OVERLAY = {
  start: 0.06,
  middle: 0.03,
  end: 0,
};

export default function HomePopularStrip({ kirtans }: HomePopularStripProps) {
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

  if (kirtans.length === 0) {
    return null;
  }

  return (
    <section className="relative -mx-5 overflow-hidden px-5 py-5">
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/Popular-background-2.jpg"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 480px"
          className="object-cover object-[50%_38%]"
          style={{ opacity: POPULAR_BG_IMAGE_OPACITY }}
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28"
        style={{
          background: `linear-gradient(180deg, rgba(78,43,24,${POPULAR_HEADER_OVERLAY.start}) 0%, rgba(78,43,24,${POPULAR_HEADER_OVERLAY.middle}) 55%, rgba(78,43,24,${POPULAR_HEADER_OVERLAY.end}) 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 top-20"
        style={{
          background: `linear-gradient(180deg, rgba(255,249,243,${POPULAR_CARDS_OVERLAY.start}) 0%, rgba(255,252,247,${POPULAR_CARDS_OVERLAY.middle}) 24%, rgba(255,252,250,${POPULAR_CARDS_OVERLAY.end}) 100%)`,
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/92">
            Popular
          </h2>
        </div>
      </div>

      <div className="relative mt-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 overflow-y-visible py-1 pr-8">
          {kirtans.map((kirtan) => {
            const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
            const active = isActive(kirtan);
            const queued = isQueued(kirtan.id);
            const favorited = isFavorited(kirtan.id);

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
                    isFavorited={favorited}
                    isQueued={queued}
                    onToggleFavorite={toggleFavorite}
                    onToggleQueue={(item) => {
                      if (queued) {
                        dequeueById(item.id);
                        return;
                      }
                      enqueue(item);
                    }}
                  />
                }
                trailingTopSlot={
                  <>
                    {durationLabel ? (
                      <span className="rounded-full bg-[#edf7f1] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#2e8c6f]">
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
