"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import SubpageHeader from "@/lib/components/SubpageHeader";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import { getMixedListItemDisplayProps } from "@/lib/kirtanCardPresentation";
import { displayHeadingClassName } from "@/lib/theme/componentThemes";

export default function HistoryPageClient() {
  const dictionary = useDictionary();
  const {
    listeningHistory,
    listeningHistoryLoaded,
    isActive,
    isPlaying,
    isLoading,
    toggle,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
  } = useAudioPlayer();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md space-y-6 px-5 py-6">
        <SubpageHeader
          backHref="/"
          backLabel={dictionary.common.home}
          title={undefined}
        />

        <section>
          {listeningHistoryLoaded && listeningHistory.length > 0 ? (
            <p
              className={`text-[0.95rem] tracking-[0.08em] text-(--theme-page-home-muted) ${displayHeadingClassName}`}
            >
              {dictionary.common.listeningHistory}
            </p>
          ) : null}

          {!listeningHistoryLoaded ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`history-loading-${index}`}
                    className="h-12 animate-pulse rounded-lg bg-stone-100"
                  />
                ))}
              </div>
            </div>
          ) : listeningHistory.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
              {dictionary.common.noListeningHistory}
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {listeningHistory.map((kirtan) => (
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
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
