"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import type { LeadListState, LeadResponse } from "@/types/leads";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import SubpageHeader from "@/lib/components/SubpageHeader";

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

    fetchWithStatus(
      `/api/explore/leads/${slug}/kirtans?lead_id=${initialData.lead.id}&type=${activeType}&limit=20`,
    )
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
  }, [activeType, initialData.lead.id, listsByType, slug]);

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
        params.set("lead_id", initialData.lead.id);
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
  }, [activeType, initialData.lead.id, isLoadingMore, listsByType, slug]);

  const visibleFilters = FILTERS.filter((filter) => (initialData.counts?.[filter.key] ?? 0) > 0);
  const showTabs = visibleFilters.length > 1;
  const visible = activeType ? (listsByType[activeType]?.kirtans ?? []) : [];
  const isListLoading = Boolean(activeType && !listsByType[activeType]);
  const featuredKirtan = initialData.featured ?? null;
  const renderedKirtans = pinnedKirtan
    ? [pinnedKirtan, ...visible.filter((k) => k.id !== pinnedKirtan.id)]
    : visible;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={visible}
            onSelect={select}
            isActive={isActive}
            onPin={setPinnedKirtan}
          />
        </Suspense>
        <SubpageHeader
          title={initialData.lead.display_name}
          backLabel="Leads"
          backHref="/explore/leads"
        />

        {featuredKirtan ? (
          <div className="-mt-10">
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
          </div>
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
                        ? "bg-[#8f4350] text-white shadow-sm"
                        : "border border-[#ead8d2] bg-white text-stone-600 hover:bg-[#fff7f3]"
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
