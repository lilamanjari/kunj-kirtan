"use client";

import Image from "next/image";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { formatKirtanDuration } from "@/lib/kirtanPresentation";
import type { KirtanSummary } from "@/types/kirtan";
import HomeRailActionButtons from "@/lib/components/HomeRailActionButtons";
import HomeRailKirtanCard from "@/lib/components/HomeRailKirtanCard";

type OverlayStops = {
  start: number;
  middle: number;
  end: number;
  middlePosition?: string;
};

type HomeCuratedKirtanStripProps = {
  title: string;
  subtitle?: string;
  kirtans: KirtanSummary[];
  backgroundSrc?: string;
  backgroundPositionClassName?: string;
  backgroundOpacity?: number;
  backgroundGradient?: string;
  headerOverlayRgb: string;
  headerOverlay: OverlayStops;
  cardsOverlayRgb: string;
  cardsOverlay: OverlayStops;
  sectionClassName?: string;
};

function getGradient(overlayRgb: string, overlay: OverlayStops) {
  return `linear-gradient(180deg, rgba(${overlayRgb},${overlay.start}) 0%, rgba(${overlayRgb},${overlay.middle}) ${overlay.middlePosition ?? "55%"}, rgba(${overlayRgb},${overlay.end}) 100%)`;
}

export default function HomeCuratedKirtanStrip({
  title,
  subtitle,
  kirtans,
  backgroundSrc,
  backgroundPositionClassName = "object-center",
  backgroundOpacity = 0.92,
  backgroundGradient,
  headerOverlayRgb,
  headerOverlay,
  cardsOverlayRgb,
  cardsOverlay,
  sectionClassName = "",
}: HomeCuratedKirtanStripProps) {
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
    <section
      className={`relative -mx-5 overflow-hidden px-5 py-5 ${sectionClassName}`.trim()}
      style={
        backgroundGradient ? { background: backgroundGradient } : undefined
      }
    >
      {backgroundSrc ? (
        <div aria-hidden="true" className="absolute inset-0">
          <Image
            src={backgroundSrc}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className={`object-cover ${backgroundPositionClassName}`}
            style={{ opacity: backgroundOpacity }}
          />
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28"
        style={{ background: getGradient(headerOverlayRgb, headerOverlay) }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 top-20"
        style={{ background: getGradient(cardsOverlayRgb, cardsOverlay) }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/92">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-white/82">{subtitle}</p>
          ) : null}
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
                  durationLabel ? (
                    <span className="rounded-full bg-[#edf7e1] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#5c7a3c]">
                      {durationLabel}
                    </span>
                  ) : null
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
