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
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import SubpageHeader from "@/lib/components/SubpageHeader";
import type { BhajansResponse } from "@/types/bhajans";

type BhajanItem = KirtanSummary;

export default function BhajansPageClient({
  initialData,
}: {
  initialData: BhajansResponse;
}) {
  const [bhajans, setBhajans] = useState<BhajanItem[]>(initialData.bhajans ?? []);
  const [search, setSearch] = useState("");
  const [hasFetchedOnce, setHasFetchedOnce] = useState((initialData.bhajans?.length ?? 0) > 0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialData.has_more));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    title: string;
    id: string;
  } | null>(initialData.next_cursor ?? null);
  const [featured, setFeatured] = useState<KirtanSummary | null>(initialData.featured ?? null);
  const hasInitializedSearch = useRef(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    toggle,
    isActive,
    isPlaying,
    isLoading,
    playCollection,
    enqueue,
    dequeueById,
    isQueued,
    select,
  } = useAudioPlayer();
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);

  function resetPagination() {
    setBhajans([]);
    setNextCursor(null);
    setHasMore(true);
  }

  useEffect(() => {
    if (!hasInitializedSearch.current) {
      hasInitializedSearch.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "20");
    const url = `/api/explore/bhajans?${params.toString()}`;
    fetchWithStatus(url)
      .then((res) => res.json())
      .then((data) => {
        setBhajans(data.bhajans ?? []);
        setHasMore(Boolean(data.has_more));
        setNextCursor(data.next_cursor ?? null);
        setHasFetchedOnce(true);
        setFeatured(data.featured ?? null);
      })
      .finally(() => setIsLoadingList(false));
  }, [search]);

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
        params.set("limit", "20");
        params.set("cursor_title", nextCursor.title);
        params.set("cursor_id", nextCursor.id);

        fetchWithStatus(`/api/explore/bhajans?${params.toString()}`)
          .then((res) => res.json())
          .then((data) => {
            setBhajans((prev) => [...prev, ...(data.bhajans ?? [])]);
            setHasMore(Boolean(data.has_more));
            setNextCursor(data.next_cursor ?? null);
          })
          .finally(() => setIsLoadingMore(false));
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, nextCursor, search]);

  const renderedBhajans = pinnedKirtan
    ? [pinnedKirtan, ...bhajans.filter((k) => k.id !== pinnedKirtan.id)]
    : bhajans;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-6">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={bhajans}
            onSelect={select}
            isActive={isActive}
            onPin={setPinnedKirtan}
          />
        </Suspense>
        <SubpageHeader title="Bhajans" backLabel="Home" backHref="/" />

        {featured ? (
          <div className="-mt-10">
            <FeaturedKirtanCard
              kirtan={featured}
              isActive={isActive(featured)}
              isPlaying={isPlaying()}
              isLoading={isLoading()}
              onToggle={() => toggle(featured)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(featured.id)}
            />
          </div>
        ) : null}

        <input
          type="text"
          placeholder="Search bhajans…"
          value={search}
          onChange={(e) => {
            setIsLoadingList(true);
            resetPagination();
            setSearch(e.target.value);
          }}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
        />

        {bhajans.length > 1 ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => playCollection(bhajans)}
              aria-label="Play all bhajans"
              title="Play all"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
            >
              <SFIcon icon={sfPlaySquareStackFill} className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => playCollection(bhajans, { shuffle: true })}
              aria-label="Shuffle bhajans"
              title="Shuffle"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white text-stone-700 shadow-sm hover:bg-[#fff7f3]"
            >
              <SFIcon icon={sfShuffleCircle} className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <ul className="space-y-3">
          {isLoadingList ? (
            <li className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`bhj-loading-${idx}`}
                    className="h-12 rounded-lg bg-stone-100 animate-pulse"
                  />
                ))}
              </div>
            </li>
          ) : renderedBhajans.length === 0 && hasFetchedOnce ? (
            <li className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
              No Bhajans match your search.
            </li>
          ) : (
            renderedBhajans.map((b) => (
              <KirtanListItem
                key={b.id}
                kirtan={b}
                isActive={isActive(b)}
                isPlaying={isPlaying()}
                isLoading={isLoading()}
                onToggle={() => toggle(b)}
                onEnqueue={enqueue}
                onDequeue={dequeueById}
                isQueued={isQueued(b.id)}
              />
            ))
          )}
        </ul>

        {isLoadingMore ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
            Loading more…
          </div>
        ) : null}
        <div ref={loadMoreRef} />
      </main>
    </div>
  );
}
