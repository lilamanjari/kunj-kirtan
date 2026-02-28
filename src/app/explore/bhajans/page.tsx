"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";

type BhajanItem = KirtanSummary;

export default function BhajansPage() {
  const [bhajans, setBhajans] = useState<BhajanItem[]>([]);
  const [search, setSearch] = useState("");
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    title: string;
    id: string;
  } | null>(null);
  const [featured, setFeatured] = useState<KirtanSummary | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { toggle, isActive, isPlaying, isLoading, enqueue, isQueued, select } =
    useAudioPlayer();
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);

  function resetPagination() {
    setBhajans([]);
    setNextCursor(null);
    setHasMore(true);
  }

  useEffect(() => {
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
            kirtans={bhajans}
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
          <h1 className="text-2xl font-semibold font-script">Bhajans</h1>
        </header>

        {featured && search.length === 0 ? (
          <FeaturedKirtanCard
            kirtan={featured}
            isActive={isActive(featured)}
            isPlaying={isPlaying()}
            isLoading={isLoading()}
            onToggle={() => toggle(featured)}
          />
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
            renderedBhajans.map((b) => {
              return (
                <KirtanListItem
                  key={b.id}
                  kirtan={b}
                  isActive={isActive(b)}
                  isPlaying={isPlaying()}
                  isLoading={isLoading()}
                  onToggle={() => toggle(b)}
                  onEnqueue={enqueue}
                  isQueued={isQueued(b.id)}
                />
              );
            })
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
