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

type LeadListState = {
  kirtans: KirtanSummary[];
  has_more: boolean;
  next_cursor: LeadCursor;
};

const FILTERS: { key: KirtanType; label: string }[] = [
  { key: "MM", label: "Maha Mantra" },
  { key: "BHJ", label: "Bhajans" },
  { key: "HK", label: "Hari Katha" },
] as const;

export default function LeadPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return null;
  }

  return <LeadPageContent key={slug} slug={slug} />;
}

function LeadPageContent({ slug }: { slug: string }) {
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
  const [listsByType, setListsByType] = useState<Partial<Record<KirtanType, LeadListState>>>({});
  const [activeType, setActiveType] = useState<KirtanType | null>(null);
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchWithStatus(`/api/explore/leads/${slug}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setActiveType(json.active_type ?? null);
        if (json.active_type) {
          setListsByType({
            [json.active_type]: {
              kirtans: json.kirtans ?? [],
              has_more: Boolean(json.has_more),
              next_cursor: json.next_cursor ?? null,
            },
          });
        }
      });
  }, [slug]);

  useEffect(() => {
    if (!activeType || !data) return;
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
  }, [activeType, data, listsByType, slug]);

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

  const visibleFilters = FILTERS.filter((filter) => (data?.counts?.[filter.key] ?? 0) > 0);
  const showTabs = visibleFilters.length > 1;
  const visible = activeType ? (listsByType[activeType]?.kirtans ?? []) : [];
  const isInitialLoading = !data;
  const isListLoading = Boolean(data && activeType && !listsByType[activeType]);
  const featuredKirtan = data?.featured ?? null;
  const renderedKirtans = pinnedKirtan
    ? [pinnedKirtan, ...visible.filter((k) => k.id !== pinnedKirtan.id)]
    : visible;

  if (isInitialLoading) {
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
