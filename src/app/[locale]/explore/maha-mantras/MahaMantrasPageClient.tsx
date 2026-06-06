"use client";

// Client-side Maha Mantra page UI.
// This file owns layout, interactivity, local filter state, and hydrated rendering.

import { Suspense, useEffect, useRef, useState } from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfMagnifyingglass,
  sfPlaySquareStackFill,
  sfShuffleCircle,
} from "@bradleyhodges/sfsymbols";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import SharedKirtanFeature from "@/lib/components/SharedKirtanFeature";
import CollectionCardGrid from "@/lib/components/CollectionCardGrid";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import SubpageHeader from "@/lib/components/SubpageHeader";
import type { MahaMantrasResponse } from "@/types/maha-mantras";
import { mahaMantrasPalette } from "@/lib/theme/pagePalettes";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import { displayHeadingClassName } from "@/lib/theme/componentThemes";
import { buildSharedCollectionCard } from "@/lib/collectionCardPresets";

type CollectionFilterKey = "ALL" | "RARE_GEMS" | "WITH_HARMONIUM";

export default function MahaMantrasPageClient({
  initialData,
}: {
  initialData: MahaMantrasResponse;
}) {
  const dictionary = useDictionary();
  const [mantras, setMantras] = useState<KirtanSummary[]>(
    initialData.mantras ?? [],
  );
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState("ALL");
  const [hasMore, setHasMore] = useState(Boolean(initialData.has_more));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(
    (initialData.mantras?.length ?? 0) > 0,
  );
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    recorded_date: string | null;
    id: string;
  } | null>(initialData.next_cursor ?? null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [featured, setFeatured] = useState<KirtanSummary | null>(
    initialData.featured ?? null,
  );
  const [collectionCounts, setCollectionCounts] = useState(
    initialData.collection_counts,
  );
  const [collectionFilter, setCollectionFilter] =
    useState<CollectionFilterKey>("ALL");
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

      fetchWithStatus(
        `/api/explore/leads/suggest?q=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
        },
      )
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
    if (collectionFilter !== "ALL") params.set("collection", collectionFilter);
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
        setCollectionCounts(data.collection_counts ?? initialData.collection_counts);
      })
      .finally(() => setIsLoadingList(false));
  }, [search, durationFilter, collectionFilter, initialData.collection_counts]);

  const durationRanges: Record<
    string,
    { label: string; min: number | null; max: number | null }
  > = {
    ALL: { label: dictionary.explore.durationAnyLength, min: null, max: null },
    UNDER_10: {
      label: dictionary.explore.durationUnder10,
      min: null,
      max: 10 * 60,
    },
    BETWEEN_10_20: {
      label: dictionary.explore.duration10To20,
      min: 10 * 60,
      max: 20 * 60,
    },
    BETWEEN_20_30: {
      label: dictionary.explore.duration20To30,
      min: 20 * 60,
      max: 30 * 60,
    },
    OVER_30: {
      label: dictionary.explore.durationOver30,
      min: 30 * 60,
      max: null,
    },
  };

  const collectionCards = [
    buildSharedCollectionCard(
      "RARE_GEMS",
      `${collectionCounts.rare_gems} kirtans`,
    ),
    buildSharedCollectionCard(
      "WITH_HARMONIUM",
      `${collectionCounts.with_harmonium} kirtans`,
    ),
  ];
  const renderedMantras = pinnedKirtan
    ? [pinnedKirtan, ...mantras.filter((k) => k.id !== pinnedKirtan.id)]
    : mantras;
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
        if (collectionFilter !== "ALL") {
          params.set("collection", collectionFilter);
        }
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
            setCollectionCounts(
              data.collection_counts ?? initialData.collection_counts,
            );
          })
          .finally(() => setIsLoadingMore(false));
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    hasMore,
    isLoadingMore,
    nextCursor,
    search,
    durationFilter,
    collectionFilter,
    initialData.collection_counts,
  ]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)]">
      <main className="relative z-10 mx-auto max-w-md space-y-6 px-5 py-6">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={renderedMantras}
            onSelect={select}
            isActive={isActive}
            onPin={handleSharedKirtan}
          />
        </Suspense>
        <SubpageHeader
          title={undefined}
          backLabel={dictionary.common.home}
          backHref="/"
        />

        <div className="mt-0">
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
          <div className={hasVisibleSharedCard ? "mt-4" : "mt-0"}>
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
              titleOverride={featured.lead_singer ?? featured.title}
              subtitleOverride={`${featured.title}${featured.sequence_num ? ` #${featured.sequence_num}` : ""}`}
            />
          </div>
        ) : null}

        <div className="mt-0">
          <h1
            className={`${displayHeadingClassName} px-0.5 text-[1.2rem] leading-none text-[#5d3b33]`}
          >
            {dictionary.explore.mahaMantrasCount.replace(
              "{count}",
              String(initialData.total_count),
            )}
          </h1>
        </div>

        <div className="-mt-4 space-y-2">
          <div className="relative min-w-0">
            <SFIcon
              icon={sfMagnifyingglass}
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c68b7f]"
            />
            <input
              type="text"
              placeholder={dictionary.search.leadSingerPlaceholder}
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full rounded-2xl border border-[#ead8cf] bg-white/92 py-2.5 pl-9 pr-4 text-sm text-[#6b4d43] shadow-sm focus:border-[#dfb19c] focus:outline-none focus:ring-1 focus:ring-[#dfb19c]"
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

          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <select
                value={durationFilter}
                onChange={(e) => {
                  setDurationFilter(e.target.value);
                  setIsLoadingList(true);
                  resetPagination();
                }}
                className="w-full rounded-2xl border border-[#ead8cf] bg-white/92 px-4 py-2.5 text-sm text-[#6b4d43] shadow-sm focus:border-[#dfb19c] focus:outline-none focus:ring-1 focus:ring-[#dfb19c]"
              >
                {Object.entries(durationRanges).map(([key, range]) => (
                  <option key={key} value={key}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>

            {mantras.length > 1 ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => playCollection(renderedMantras)}
                  aria-label={dictionary.actions.playAll}
                  title={dictionary.actions.playAll}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ead8cf] bg-white text-[#8b6657] shadow-sm hover:bg-[#fff8f4]"
                >
                  <SFIcon
                    icon={sfPlaySquareStackFill}
                    className="h-4.5 w-4.5"
                  />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    playCollection(renderedMantras, { shuffle: true })
                  }
                  aria-label={dictionary.actions.shuffle}
                  title={dictionary.actions.shuffle}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ead8cf] bg-white text-[#8b6657] shadow-sm hover:bg-[#fff8f4]"
                >
                  <SFIcon icon={sfShuffleCircle} className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : null}
          </div>
          <CollectionCardGrid
            cards={collectionCards}
            selectedKey={collectionFilter}
            onSelect={(key) =>
              setCollectionFilter((current) =>
                current === key ? "ALL" : key,
              )
            }
          />
        </div>

        <ul className="space-y-0">
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
                leadingVisual={
                  <LeadSingerAvatar
                    name={m.lead_singer}
                    imageUrl={m.lead_singer_image_url}
                    alt={m.lead_singer_image_alt}
                  />
                }
                isActive={isActive(m)}
                isPlaying={isPlaying(m)}
                isLoading={isLoading(m)}
                titleOverride={m.lead_singer ?? m.title}
                subtitleOverride={`${m.title}${m.sequence_num ? ` #${m.sequence_num}` : ""}`}
                useShortDate
                truncateSangaAt={10}
                stackActionsOnMobile
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
