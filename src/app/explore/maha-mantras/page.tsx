"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";

export default function MahaMantrasPage() {
  const [mantras, setMantras] = useState<KirtanSummary[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState("ALL");
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [nextCursor, setNextCursor] = useState<{
    created_at: string;
    id: string;
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toggle, isActive, isPlaying, isLoading, enqueue, isQueued, select } =
    useAudioPlayer();
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);

  function resetPagination() {
    setMantras([]);
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
      })
      .finally(() => setIsLoadingList(false));
  }, [search, durationFilter]);

  const durationRanges: Record<
    string,
    { label: string; min: number | null; max: number | null }
  > = {
    ALL: { label: "Any length", min: null, max: null },
    UNDER_10: { label: "Under 10 min", min: null, max: 10 * 60 },
    BETWEEN_10_20: { label: "10-20 min", min: 10 * 60, max: 20 * 60 },
    BETWEEN_20_30: { label: "20-30 min", min: 20 * 60, max: 30 * 60 },
    OVER_30: { label: "Over 30 min", min: 30 * 60, max: null },
  };

  const visibleMantras = mantras;
  const renderedMantras = pinnedKirtan
    ? [pinnedKirtan, ...visibleMantras.filter((k) => k.id !== pinnedKirtan.id)]
    : visibleMantras;

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
        params.set("cursor_created_at", nextCursor.created_at);
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
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_#ffe4ef_0%,_#fff6fa_45%,_#f8fafc_100%)] text-stone-900 overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 h-64 w-64 bg-[url('/floral-corner.png')] bg-no-repeat bg-right-top opacity-40"
        style={{
          backgroundSize: "280px auto",
          right: "max(0px, calc(50% - 14rem + 8px))",
        }}
      />
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <div className="pointer-events-none absolute -top-10 left-6 h-28 w-28 rounded-full bg-rose-300/40 blur-3xl" />
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={visibleMantras}
            onSelect={select}
            isActive={isActive}
            onPin={setPinnedKirtan}
          />
        </Suspense>
        <header className="space-y-1">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wide text-rose-400 hover:text-rose-500"
          >
            Home
          </Link>
          <h1 className="text-2xl font-semibold font-script">Maha Mantra</h1>
        </header>

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
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
          />

          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
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
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-stone-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Duration
          </p>
          <select
            value={durationFilter}
            onChange={(e) => {
              setDurationFilter(e.target.value);
              setIsLoadingList(true);
              resetPagination();
            }}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
          >
            {Object.entries(durationRanges).map(([key, range]) => (
              <option key={key} value={key}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <ul className="space-y-3">
          {isLoadingList ? (
            <li className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`mm-loading-${idx}`}
                    className="h-12 rounded-lg bg-stone-100 animate-pulse"
                  />
                ))}
              </div>
            </li>
          ) : renderedMantras.length === 0 && hasFetchedOnce ? (
            <li className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
              No Maha Mantras match your filters.
            </li>
          ) : (
            renderedMantras.map((m) => {
              return (
                <KirtanListItem
                  key={m.id}
                  kirtan={m}
                  isActive={isActive(m)}
                  isPlaying={isPlaying()}
                  isLoading={isLoading()}
                  onToggle={() => toggle(m)}
                  onEnqueue={enqueue}
                  isQueued={isQueued(m.id)}
                />
              );
            })
          )}
        </ul>

        {hasMore ? (
          <div
            ref={loadMoreRef}
            className="py-4 text-center text-xs text-stone-500"
          >
            {isLoadingMore ? (
              <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
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
