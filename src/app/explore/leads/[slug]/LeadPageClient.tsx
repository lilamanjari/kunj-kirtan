"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import type { LeadListState, LeadResponse } from "./types";

const FILTERS: { key: KirtanType; label: string }[] = [
  { key: "MM", label: "Maha Mantra" },
  { key: "BHJ", label: "Bhajans" },
  { key: "HK", label: "Hari Katha" },
] as const;

export default function LeadPageClient({
  slug,
  initialData,
}: {
  slug: string;
  initialData: LeadResponse;
}) {
  const {
    isActive,
    isPlaying,
    isLoading: isAudioLoading,
    toggle,
    enqueue,
    dequeueById,
    isQueued,
    select,
  } = useAudioPlayer();

  const [listsByType, setListsByType] = useState<Partial<Record<KirtanType, LeadListState>>>(
    initialData.active_type
      ? {
          [initialData.active_type]: {
            kirtans: initialData.kirtans ?? [],
            has_more: Boolean(initialData.has_more),
            next_cursor: initialData.next_cursor ?? null,
          },
        }
      : {},
  );
  const [activeType, setActiveType] = useState<KirtanType | null>(initialData.active_type ?? null);
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeType) return;
    if (listsByType[activeType]) return;

    fetchWithStatus(`/api/explore/leads/${slug}/kirtans?type=${activeType}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        setListsByType((prev) => ({
          ...prev,
          [activeType]: {
            kirtans: json.kirtans ?? [],
            has_more: Boolean(json.has_more),
            next_cursor: json.next_cursor ?? null,
          },
        }));
      });
  }, [activeType, listsByType, slug]);

  useEffect(() => {
    const activeList = activeType ? listsByType[activeType] : null;
    if (!activeList?.has_more || isLoadingMore) return;
    if (!activeType) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || !activeList.next_cursor) return;

        setIsLoadingMore(true);
        const params = new URLSearchParams();
        params.set("type", activeType);
        params.set("limit", "20");

        if ("title" in activeList.next_cursor) {
          params.set("cursor_title", activeList.next_cursor.title);
          params.set("cursor_id", activeList.next_cursor.id);
        } else {
          if (activeList.next_cursor.recorded_date) {
            params.set("cursor_recorded_date", activeList.next_cursor.recorded_date);
          }
          params.set("cursor_id", activeList.next_cursor.id);
        }

        fetchWithStatus(`/api/explore/leads/${slug}/kirtans?${params.toString()}`)
          .then((res) => res.json())
          .then((json) => {
            setListsByType((prev) => ({
              ...prev,
              [activeType]: {
                kirtans: [...(prev[activeType]?.kirtans ?? []), ...(json.kirtans ?? [])],
                has_more: Boolean(json.has_more),
                next_cursor: json.next_cursor ?? null,
              },
            }));
          })
          .finally(() => setIsLoadingMore(false));
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeType, isLoadingMore, listsByType, slug]);

  const visibleFilters = FILTERS.filter((filter) => (initialData.counts?.[filter.key] ?? 0) > 0);
  const showTabs = visibleFilters.length > 1;
  const visible = activeType ? (listsByType[activeType]?.kirtans ?? []) : [];
  const isListLoading = Boolean(activeType && !listsByType[activeType]);
  const featuredKirtan = initialData.featured ?? null;
  const renderedKirtans = pinnedKirtan
    ? [pinnedKirtan, ...visible.filter((k) => k.id !== pinnedKirtan.id)]
    : visible;

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_#ffe4ef_0%,_#fff6fa_45%,_#f8fafc_100%)] text-stone-900 overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 h-64 w-64 bg-[url('/floral-corner.png')] bg-no-repeat bg-right-top opacity-40"
        style={{
          backgroundSize: "280px auto",
          right: "max(0px, calc(50% - 14rem + 8px))",
        }}
      />
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
        <div className="pointer-events-none absolute -top-10 left-6 h-28 w-28 rounded-full bg-rose-300/40 blur-3xl" />
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={visible}
            onSelect={select}
            isActive={isActive}
            onPin={setPinnedKirtan}
          />
        </Suspense>
        <header className="space-y-2">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wide text-rose-400 hover:text-rose-500"
          >
            Home
          </Link>
          <h1 className="text-2xl font-semibold font-script">
            {initialData.lead.display_name}
          </h1>
        </header>

        {featuredKirtan ? (
          <FeaturedKirtanCard
            kirtan={featuredKirtan}
            isActive={isActive(featuredKirtan)}
            isPlaying={isPlaying()}
            isLoading={isAudioLoading()}
            onToggle={() => toggle(featuredKirtan)}
            onEnqueue={enqueue}
            onDequeue={dequeueById}
            isQueued={isQueued(featuredKirtan.id)}
          />
        ) : null}

        {showTabs ? (
          <div className="flex gap-2">
            {visibleFilters.map((filter) => {
              const active = activeType === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => {
                    setPinnedKirtan(null);
                    setActiveType(filter.key);
                  }}
                  className={`
                    rounded-full px-4 py-1.5 text-xs font-medium transition
                    ${
                      active
                        ? "bg-rose-600 text-white"
                        : "bg-white text-stone-600 border border-stone-200 hover:bg-rose-50"
                    }
                  `}
                >
                  {filter.label} ({initialData.counts?.[filter.key] ?? 0})
                </button>
              );
            })}
          </div>
        ) : null}

        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Kirtans
          </h2>

          {isListLoading ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`lead-kirtan-loading-${idx}`}
                    className="h-12 rounded-lg bg-stone-100 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : renderedKirtans.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No kirtans found.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {renderedKirtans.map((k) => (
                <KirtanListItem
                  key={k.id}
                  kirtan={k}
                  isActive={isActive(k)}
                  isPlaying={isPlaying()}
                  isLoading={isAudioLoading()}
                  onToggle={() => toggle(k)}
                  onEnqueue={enqueue}
                  onDequeue={dequeueById}
                  isQueued={isQueued(k.id)}
                />
              ))}
            </ul>
          )}
          {isLoadingMore ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-white px-4 py-4 text-center text-sm text-stone-500">
              Loading more…
            </div>
          ) : null}
          <div ref={loadMoreRef} />
        </section>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </main>
    </div>
  );
}
