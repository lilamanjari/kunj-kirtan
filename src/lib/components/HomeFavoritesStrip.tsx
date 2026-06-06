"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { formatKirtanDuration } from "@/lib/kirtanPresentation";
import type { KirtanSummary } from "@/types/kirtan";
import HomeRailKirtanCard from "@/lib/components/HomeRailKirtanCard";
import HomeRailActionButtons from "@/lib/components/HomeRailActionButtons";
import {
  durationPillClassName,
  homeSectionEyebrowClassName,
} from "@/lib/theme/componentThemes";
import { radiusClassNames } from "@/lib/theme/radii";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

type HomeFavoritesStripProps = {
  favorites: KirtanSummary[];
  loaded: boolean;
};

export default function HomeFavoritesStrip({
  favorites,
  loaded,
}: HomeFavoritesStripProps) {
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
  } = useAudioPlayer();

  if (!loaded || favorites.length === 0) {
    return null;
  }

  const previewFavorites = favorites.slice(0, 4);

  return (
    <section className="relative bg-transparent">
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <h2 className={homeSectionEyebrowClassName}>
            {dictionary.common.favorites}
          </h2>
        </div>
        <div className="shrink-0">
          <LocalizedLink
            href="/favorites"
            className={`border border-[color:var(--theme-page-home-border)] bg-white/88 px-3 py-1.5 text-xs font-medium text-[color:var(--theme-page-home-muted)] shadow-sm transition hover:bg-white ${radiusClassNames.button}`}
          >
            {dictionary.common.viewAll}
          </LocalizedLink>
        </div>
      </div>

      <div className="relative mt-2 overflow-x-auto bg-transparent pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 overflow-y-visible bg-transparent py-1 pl-2 pr-8">
          {previewFavorites.map((kirtan) => {
            const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
            const active = isActive(kirtan);
            const queued = isQueued(kirtan.id);

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
                    {durationLabel ? (
                      <span
                        className={`${radiusClassNames.badge} px-2.5 py-1 text-[11px] font-semibold tracking-wide ${durationPillClassName}`}
                      >
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
