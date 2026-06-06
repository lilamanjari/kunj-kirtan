"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { formatKirtanDuration } from "@/lib/kirtanPresentation";
import type { KirtanSummary } from "@/types/kirtan";
import HomeRailActionButtons from "@/lib/components/HomeRailActionButtons";
import HomeRailKirtanCard from "@/lib/components/HomeRailKirtanCard";
import {
  durationPillClassName,
  homeSectionEyebrowClassName,
} from "@/lib/theme/componentThemes";
import { radiusClassNames } from "@/lib/theme/radii";

type HomeCuratedKirtanStripProps = {
  title: string;
  subtitle?: string;
  kirtans: KirtanSummary[];
  sectionClassName?: string;
};

export default function HomeCuratedKirtanStrip({
  title,
  subtitle,
  kirtans,
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
    <section className={`relative bg-transparent ${sectionClassName}`.trim()}>
      <div className="relative flex items-center justify-between gap-1">
        <div>
          <h2 className={homeSectionEyebrowClassName}>{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-[color:var(--theme-page-home-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mt-2 overflow-x-auto bg-transparent pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 overflow-y-visible bg-transparent py-1 pl-2 pr-8">
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
                isPlaying={isPlaying(kirtan)}
                isLoading={isLoading(kirtan)}
                onActivate={() => play(kirtan)}
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
                    <span
                      className={`${radiusClassNames.badge} px-2.5 py-1 text-[11px] font-semibold tracking-wide ${durationPillClassName}`}
                    >
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
