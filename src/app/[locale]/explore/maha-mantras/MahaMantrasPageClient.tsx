"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlaySquareStackFill,
  sfShuffleCircle,
} from "@bradleyhodges/sfsymbols";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import SharedKirtanFeature from "@/lib/components/SharedKirtanFeature";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import SubpageHeader from "@/lib/components/SubpageHeader";
import type { MahaMantrasResponse } from "@/types/maha-mantras";
import { mahaMantrasPalette } from "@/lib/theme/pagePalettes";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

export default function MahaMantrasPageClient({
  initialData,
}: {
  initialData: MahaMantrasResponse;
}) {
  const dictionary = useDictionary();
  const [mantras, setMantras] = useState<KirtanSummary[]>(initialData.mantras ?? []);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState("ALL");
  const [hasMore, setHasMore] = useState(Boolean(initialData.has_more));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState((initialData.mantras?.length ?? 0) > 0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    recorded_date: string | null;
    id: string;
  } | null>(initialData.next_cursor ?? null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [featured, setFeatured] = useState<KirtanSummary | null>(initialData.featured ?? null);
  const hasInitializedFilters = useRef(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    toggle,
    isActive,
    isPlaying,
    isLoading,
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

  function resetPagination() {
    setNextCursor(null);
    setHasMore(true);
  }

  function handleSearchInputChange(value: string) {
    setSearchInput(value);
    setShowSuggestions(true);
    setIsLoadingList(true);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearch(value.trim());
      resetPagination();
    }, 250);

    if (suggestDebounceRef.current) {
      clearTimeout(suggestDebounceRef.current);
    }

    const query = value.trim();
    if (query.length < 2) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      setSuggestions([]);
      return;
    }

    suggestDebounceRef.current = setTimeout(() => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }

      const controller = new AbortController();
      searchAbortRef.current = controller;

      fetchWithStatus(`/api/explore/leads/suggest?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => setSuggestions(data.suggestions ?? []))
        .catch((err) => {
          if (err.name !== "AbortError") {
            setSuggestions([]);
          }
        });
    }, 150);
  }

  useEffect(() => {
    if (!hasInitializedFilters.current) {
      hasInitializedFilters.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (durationFilter) params.set("duration", durationFilter);
    params.set("limit", "20");

    const url = `/api/explore/maha-mantras?${params.toString()}`;

    fetchWithStatus(url)
      .then((res) => res.json())
      .then((data) => {
        setMantras(data.mantras ?? []);
        setHasMore(Boolean(data.has_more));
        setNextCursor(data.next_cursor ?? null);
        setHasFetchedOnce(true);
        setFeatured(data.featured ?? null);
      })
      .finally(() => setIsLoadingList(false));
  }, [search, durationFilter]);

  const durationRanges: Record<
    string,
    { label: string; min: number | null; max: number | null }
  > = {
    ALL: { label: dictionary.explore.durationAnyLength, min: null, max: null },
    UNDER_10: { label: dictionary.explore.durationUnder10, min: null, max: 10 * 60 },
    BETWEEN_10_20: { label: dictionary.explore.duration10To20, min: 10 * 60, max: 20 * 60 },
    BETWEEN_20_30: { label: dictionary.explore.duration20To30, min: 20 * 60, max: 30 * 60 },
    OVER_30: { label: dictionary.explore.durationOver30, min: 30 * 60, max: null },
  };

  const visibleMantras = mantras;
  const renderedMantras = pinnedKirtan
    ? [pinnedKirtan, ...visibleMantras.filter((k) => k.id !== pinnedKirtan.id)]
    : visibleMantras;
  const hasVisibleSharedCard = !!sharedKirtan && !sharedCardDismissed;
  const shouldHideFeatured =
    hasVisibleSharedCard && sharedKirtan.id === featured?.id;

  function handleSharedKirtan(kirtan: KirtanSummary) {
    setPinnedKirtan(kirtan);
    setSharedKirtan(kirtan);
    setSharedCardDismissed(false);
  }

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (!nextCursor) return;

        setIsLoadingMore(true);

        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (durationFilter) params.set("duration", durationFilter);
        params.set("limit", "20");
        if (nextCursor.recorded_date) {
          params.set("cursor_recorded_date", nextCursor.recorded_date);
        }
        params.set("cursor_id", nextCursor.id);

        fetchWithStatus(`/api/explore/maha-mantras?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => {
            setMantras((prev) => [...prev, ...(data.mantras ?? [])]);
            setHasMore(Boolean(data.has_more));
            setNextCursor(data.next_cursor ?? null);
          })
          .finally(() => setIsLoadingMore(false));
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, nextCursor, search, durationFilter]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={visibleMantras}
            onSelect={select}
            isActive={isActive}
            onPin={handleSharedKirtan}
          />
        </Suspense>
        <SubpageHeader
          title={dictionary.explore.mahaMantra}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <div className="-mt-6">
          <SharedKirtanFeature
            kirtan={sharedKirtan}
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
        </div>

        {featured && !shouldHideFeatured ? (
          <div className={hasVisibleSharedCard ? "mt-4" : "-mt-6"}>
            <FeaturedKirtanCard
              kirtan={featured}
              isActive={isActive(featured)}
              isPlaying={isPlaying(featured)}
              isLoading={isLoading(featured)}
              onToggle={() => toggle(featured)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(featured.id)}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(featured.id)}
              palette={mahaMantrasPalette.featuredCard}
            />
          </div>
        ) : null}

        <div className="relative">
          <input
            type="text"
            placeholder="Search by lead singer…"
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full rounded-xl border border-[#ead8cf] bg-white/92 px-4 py-2 text-sm text-[#6b4d43] shadow-sm focus:border-[#dfb19c] focus:outline-none focus:ring-1 focus:ring-[#dfb19c]"
          />

          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[#ead8cf] bg-white shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchInput(s);
                    setSearch(s);
                    setIsLoadingList(true);
                    resetPagination();
                    setShowSuggestions(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-[#6b4d43] hover:bg-[#fff8f4]"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <select
              value={durationFilter}
              onChange={(e) => {
                setDurationFilter(e.target.value);
                setIsLoadingList(true);
                resetPagination();
              }}
              className="w-full rounded-xl border border-[#ead8cf] bg-white/92 px-4 py-2 text-sm text-[#6b4d43] shadow-sm focus:border-[#dfb19c] focus:outline-none focus:ring-1 focus:ring-[#dfb19c]"
            >
              {Object.entries(durationRanges).map(([key, range]) => (
                <option key={key} value={key}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>

          {visibleMantras.length > 1 ? (
            <div className="flex gap-2 pb-[1px]">
              <button
                type="button"
                onClick={() => playCollection(visibleMantras)}
                aria-label={dictionary.actions.playAll}
                title={dictionary.actions.playAll}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8cf] bg-white text-[#8b6657] shadow-sm hover:bg-[#fff8f4]"
              >
                <SFIcon icon={sfPlaySquareStackFill} className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => playCollection(visibleMantras, { shuffle: true })}
                aria-label={dictionary.actions.shuffle}
                title={dictionary.actions.shuffle}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8cf] bg-white text-[#8b6657] shadow-sm hover:bg-[#fff8f4]"
              >
                <SFIcon icon={sfShuffleCircle} className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <ul className="space-y-3">
          {isLoadingList ? (
            <li className="rounded-xl border border-dashed border-[#ead8cf] bg-white/88 px-4 py-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`mm-loading-${idx}`}
                    className="h-12 rounded-lg bg-[#f8eeea] animate-pulse"
                  />
                ))}
              </div>
            </li>
          ) : renderedMantras.length === 0 && hasFetchedOnce ? (
            <li className="rounded-xl border border-dashed border-[#ead8cf] bg-white/88 px-4 py-6 text-center text-sm text-[#9b7a6c]">
              {dictionary.explore.noMahaMantrasMatch}
            </li>
          ) : (
            renderedMantras.map((m) => (
              <KirtanListItem
                key={m.id}
                kirtan={m}
                isActive={isActive(m)}
                isPlaying={isPlaying(m)}
                isLoading={isLoading(m)}
                onToggle={() => toggle(m)}
                onEnqueue={enqueue}
                onDequeue={dequeueById}
                isQueued={isQueued(m.id)}
                onToggleFavorite={toggleFavorite}
                isFavorited={isFavorited(m.id)}
              />
            ))
          )}
        </ul>

        {hasMore ? (
          <div
            ref={loadMoreRef}
            className="py-4 text-center text-xs text-[#9b7a6c]"
          >
            {isLoadingMore ? (
              <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-[#e5c9bc] border-t-[#b98473]" />
            ) : (
              ""
            )}
          </div>
        ) : null}

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </main>
    </div>
  );
}
