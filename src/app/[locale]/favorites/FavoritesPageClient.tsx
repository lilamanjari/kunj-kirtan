"use client";
import { useState } from "react";
import type { KirtanType } from "@/types/kirtan";
import { selectFavorites } from "@/lib/offline/selectFavorites";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlaySquareStackFill,
  sfShuffleCircle,
} from "@bradleyhodges/sfsymbols";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import SubpageHeader from "@/lib/components/SubpageHeader";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import { getMixedListItemDisplayProps } from "@/lib/kirtanCardPresentation";
import { displayHeadingClassName } from "@/lib/theme/componentThemes";

export default function FavoritesPageClient() {
  const dictionary = useDictionary();
  const {
    favorites,
    favoritesLoaded,
    offlineLoaded,
    offlineSupported,
    offlineEnabled,
    offlineStorageLimitReached,
    offlineDownloadingCount,
    isActive,
    isPlaying,
    isLoading,
    toggle,
    playCollection,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
    toggleOfflineEnabled,
    toggleOfflineForKirtan,
  } = useAudioPlayer();

  const [selectedType, setSelectedType] = useState<KirtanType | null>(null);
  const filters: { key: KirtanType; label: string }[] = [
    { key: "MM", label: dictionary.explore.mahaMantra },
    { key: "BHJ", label: dictionary.explore.bhajans },
    { key: "HK", label: dictionary.explore.hariKatha },
  ];
  const visibleFilters = filters.filter(({ key }) =>
    favorites.some(item => item.type === key),
  );
  const activeType = visibleFilters.find(({ key }) => key === selectedType)?.key
    ?? visibleFilters[0]?.key
    ?? "MM";
  const visibleFavorites = selectFavorites(favorites, activeType);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <SubpageHeader
          title={undefined}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <section>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {favoritesLoaded && favorites.length > 0 ? (
                <p
                  className={`truncate text-[0.95rem] tracking-[0.08em] text-(--theme-page-home-muted) ${displayHeadingClassName}`}
                >
                  {visibleFavorites.length} {dictionary.common.favorites}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {offlineLoaded ? (
                <>
                  <button
                    type="button"
                    onClick={() => void toggleOfflineEnabled(!offlineEnabled)}
                    disabled={!offlineSupported}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition ${
                      !offlineSupported
                        ? "cursor-not-allowed border-[#ead8d2] bg-white text-stone-300 opacity-60"
                        : ""
                    } ${
                      offlineEnabled
                        ? "border-[#6f9752]/45 bg-[#eff5ea] text-[#5a7a43] hover:bg-[#e7f0df]"
                        : "border-[#ead8d2] bg-white text-stone-400 hover:bg-[#fff7f3]"
                    }`}
                    aria-label={dictionary.common.offlineFavorites}
                    title={
                      offlineSupported
                        ? dictionary.common.offlineFavorites
                        : "Offline downloads require HTTPS or localhost"
                    }
                  >
                    {offlineSupported &&
                    offlineEnabled &&
                    offlineDownloadingCount > 0 ? (
                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[#b7c9a7] border-t-[#6f9752]" />
                    ) : (
                      <span className="text-[14px] font-bold leading-none">
                        ↓
                      </span>
                    )}
                  </button>
                </>
              ) : null}
              {visibleFavorites.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => playCollection(visibleFavorites)}
                    aria-label={dictionary.actions.playAll}
                    title={dictionary.actions.playAll}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
                  >
                    <SFIcon icon={sfPlaySquareStackFill} className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => playCollection(visibleFavorites, { shuffle: true })}
                    aria-label={dictionary.actions.shuffle}
                    title={dictionary.actions.shuffle}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
                  >
                    <SFIcon icon={sfShuffleCircle} className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {offlineEnabled && offlineStorageLimitReached ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-[#b56553]">
              {dictionary.common.offlineStorageLimitReached}
            </p>
          ) : null}

          {visibleFilters.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2" aria-label={dictionary.common.favorites}>
              {visibleFilters.map(({ key, label }) => (
                <button key={key} type="button" aria-pressed={activeType === key}
                  onClick={() => setSelectedType(key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${activeType === key
                    ? "bg-(--theme-player-green) text-white shadow-sm"
                    : "border border-[#efd4cb] bg-white text-[#7e665c] hover:bg-[#fff8f4]"}`}>
                  {label} ({favorites.filter(item => item.type === key).length})
                </button>
              ))}
            </div>
          ) : null}

          {!favoritesLoaded ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`favorites-loading-${idx}`}
                    className="h-12 rounded-lg bg-stone-100 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : visibleFavorites.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
              {favorites.length === 0 ? dictionary.common.noFavoritesYet : dictionary.explore.noKirtansFound}
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {visibleFavorites.map((kirtan) => (
                <KirtanListItem
                  key={kirtan.id}
                  kirtan={kirtan}
                  {...getMixedListItemDisplayProps(kirtan)}
                  isActive={isActive(kirtan)}
                  isPlaying={isPlaying(kirtan)}
                  isLoading={isLoading(kirtan)}
                  onToggle={() => toggle(kirtan)}
                  onEnqueue={enqueue}
                  onDequeue={dequeueById}
                  isQueued={isQueued(kirtan.id)}
                  onToggleFavorite={toggleFavorite}
                  isFavorited={isFavorited(kirtan.id)}
                  showOfflineToggle={offlineEnabled}
                  onToggleOffline={toggleOfflineForKirtan}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
