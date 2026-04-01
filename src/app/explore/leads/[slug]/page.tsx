"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";

type LeadCounts = Record<KirtanType, number>;
type LeadCursor =
  | { title: string; id: string }
  | { recorded_date: string | null; id: string }
  | null;

type LeadResponse = {
  lead: {
    display_name: string;
  };
  counts: LeadCounts;
  active_type: KirtanType | null;
  has_more: boolean;
  next_cursor: LeadCursor;
  kirtans: KirtanSummary[];
  featured?: KirtanSummary | null;
};

const FILTERS: { key: KirtanType; label: string }[] = [
  { key: "MM", label: "Maha Mantra" },
  { key: "BHJ", label: "Bhajans" },
  { key: "HK", label: "Hari Katha" },
] as const;

export default function LeadPage() {
  const { slug } = useParams<{ slug: string }>();
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

  const [data, setData] = useState<LeadResponse | null>(null);
  const [activeType, setActiveType] = useState<KirtanType | null>(null);
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [featured, setFeatured] = useState<KirtanSummary | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsPageLoading(true);
    const params = new URLSearchParams();
    if (activeType) {
      params.set("type", activeType);
    }
    fetchWithStatus(`/api/explore/leads/${slug}?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setFeatured(json.featured ?? null);
        setActiveType((current) => current ?? json.active_type ?? null);
      })
      .finally(() => setIsPageLoading(false));
  }, [slug, activeType]);

  useEffect(() => {
    if (!data?.has_more || isLoadingMore) return;
    if (!activeType) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || !data?.next_cursor) return;

        setIsLoadingMore(true);
        const params = new URLSearchParams();
        params.set("type", activeType);
        params.set("limit", "20");

        if ("title" in data.next_cursor) {
          params.set("cursor_title", data.next_cursor.title);
          params.set("cursor_id", data.next_cursor.id);
        } else {
          if (data.next_cursor.recorded_date) {
            params.set("cursor_recorded_date", data.next_cursor.recorded_date);
          }
          params.set("cursor_id", data.next_cursor.id);
        }

        fetchWithStatus(`/api/explore/leads/${slug}?${params.toString()}`)
          .then((res) => res.json())
          .then((json) => {
            setData((prev) => {
              if (!prev) return json;
              return {
                ...prev,
                counts: json.counts,
                active_type: json.active_type,
                has_more: json.has_more,
                next_cursor: json.next_cursor,
                kirtans: [...prev.kirtans, ...(json.kirtans ?? [])],
              };
            });
          })
          .finally(() => setIsLoadingMore(false));
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeType, data, isLoadingMore, slug]);

  const visibleFilters = FILTERS.filter((filter) => (data?.counts?.[filter.key] ?? 0) > 0);
  const showTabs = visibleFilters.length > 1;
  const visible = data?.kirtans ?? [];
  const renderedKirtans = pinnedKirtan
    ? [pinnedKirtan, ...visible.filter((k) => k.id !== pinnedKirtan.id)]
    : visible;

  if (!data && isPageLoading) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900">
        <main className="mx-auto max-w-md px-5 py-6 space-y-6">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-stone-100 animate-pulse" />
            <div className="h-8 w-48 rounded-lg bg-stone-100 animate-pulse" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`lead-loading-${idx}`}
                className="h-12 rounded-lg bg-stone-100 animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return null;
  }

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
        {/* Header */}
        <header className="space-y-2">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wide text-rose-400 hover:text-rose-500"
          >
            Home
          </Link>
          <h1 className="text-2xl font-semibold font-script">
            {data.lead.display_name}
          </h1>
        </header>

        {featured ? (
          <FeaturedKirtanCard
            kirtan={featured}
            isActive={isActive(featured)}
            isPlaying={isPlaying()}
            isLoading={isAudioLoading()}
            onToggle={() => toggle(featured)}
            onEnqueue={enqueue}
            onDequeue={dequeueById}
            isQueued={isQueued(featured.id)}
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
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            kirtans: [],
                            has_more: false,
                            next_cursor: null,
                          }
                        : prev,
                    );
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
                  {filter.label} ({data?.counts?.[filter.key] ?? 0})
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Kirtan list */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Kirtans
          </h2>

          {isPageLoading ? (
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
