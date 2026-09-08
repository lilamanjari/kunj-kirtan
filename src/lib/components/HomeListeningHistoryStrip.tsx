"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { formatKirtanDuration } from "@/lib/kirtanPresentation";
import HomeRailActionButtons from "@/lib/components/HomeRailActionButtons";
import HomeRailKirtanCard from "@/lib/components/HomeRailKirtanCard";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import {
  durationPillClassName,
  homeSectionEyebrowClassName,
} from "@/lib/theme/componentThemes";
import { radiusClassNames } from "@/lib/theme/radii";

export default function HomeListeningHistoryStrip() {
  const dictionary = useDictionary();
  const {
    listeningHistory,
    listeningHistoryLoaded,
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

  if (!listeningHistoryLoaded || listeningHistory.length === 0) {
    return null;
  }

  return (
    <section className="relative bg-transparent">
      <div className="relative flex items-center justify-between gap-3">
        <h2 className={homeSectionEyebrowClassName}>
          {dictionary.common.listeningHistory}
        </h2>
        <LocalizedLink
          href="/history"
          className={`shrink-0 border border-[color:var(--theme-page-home-border)] bg-white/88 px-3 py-1.5 text-xs font-medium text-[color:var(--theme-page-home-muted)] shadow-sm transition hover:bg-white ${radiusClassNames.button}`}
        >
          {dictionary.common.more}
        </LocalizedLink>
      </div>

      <div className="relative mt-2 overflow-x-auto bg-transparent pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 overflow-y-visible bg-transparent py-1 pl-2 pr-8">
          {listeningHistory.slice(0, 10).map((kirtan) => {
            const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
            const queued = isQueued(kirtan.id);

            return (
              <HomeRailKirtanCard
                key={kirtan.id}
                kirtan={kirtan}
                isActive={isActive(kirtan)}
                isPlaying={isPlaying(kirtan)}
                isLoading={isLoading(kirtan)}
                onActivate={() => play(kirtan)}
                leadingSlot={
                  <HomeRailActionButtons
                    kirtan={kirtan}
                    isFavorited={isFavorited(kirtan.id)}
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
                      className={`${radiusClassNames.badge} px-2 py-[0.3rem] text-[10px] font-semibold tracking-wide ${durationPillClassName}`}
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
