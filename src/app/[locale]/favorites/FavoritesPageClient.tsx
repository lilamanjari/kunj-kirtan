"use client";

import { Suspense, useState } from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlaySquareStackFill,
  sfShuffleCircle,
} from "@bradleyhodges/sfsymbols";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import KirtanListItem from "@/lib/components/KirtanListItem";
import SharedKirtanFeature from "@/lib/components/SharedKirtanFeature";
import SubpageHeader from "@/lib/components/SubpageHeader";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

export default function FavoritesPageClient() {
  const dictionary = useDictionary();
  const {
    favorites,
    favoritesLoaded,
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
    select,
  } = useAudioPlayer();
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedKirtan, setSharedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedCardDismissed, setSharedCardDismissed] = useState(false);

  const activePinnedKirtan =
    pinnedKirtan && isFavorited(pinnedKirtan.id) ? pinnedKirtan : null;
  const renderedFavorites = activePinnedKirtan
    ? [
        activePinnedKirtan,
        ...favorites.filter((k) => k.id !== activePinnedKirtan.id),
      ]
    : favorites;

  function handleSharedKirtan(kirtan: KirtanSummary) {
    setPinnedKirtan(kirtan);
    setSharedKirtan(kirtan);
    setSharedCardDismissed(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={favorites}
            onSelect={select}
            isActive={isActive}
            onPin={handleSharedKirtan}
          />
        </Suspense>
        <SubpageHeader
          title={dictionary.common.favorites}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <SharedKirtanFeature
          kirtan={sharedKirtan && !sharedCardDismissed ? sharedKirtan : null}
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

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-wide text-stone-500">
              {dictionary.common.savedKirtans}
            </h2>
            {favorites.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playCollection(favorites)}
                  aria-label={dictionary.actions.playAll}
                  title={dictionary.actions.playAll}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
                >
                  <SFIcon icon={sfPlaySquareStackFill} className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => playCollection(favorites, { shuffle: true })}
                  aria-label={dictionary.actions.shuffle}
                  title={dictionary.actions.shuffle}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
                >
                  <SFIcon icon={sfShuffleCircle} className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

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
          ) : renderedFavorites.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
              {dictionary.common.noFavoritesYet}
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {renderedFavorites.map((kirtan) => (
                <KirtanListItem
                  key={kirtan.id}
                  kirtan={kirtan}
                  isActive={isActive(kirtan)}
                  isPlaying={isPlaying(kirtan)}
                  isLoading={isLoading(kirtan)}
                  onToggle={() => toggle(kirtan)}
                  onEnqueue={enqueue}
                  onDequeue={dequeueById}
                  isQueued={isQueued(kirtan.id)}
                  onToggleFavorite={toggleFavorite}
                  isFavorited={isFavorited(kirtan.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
