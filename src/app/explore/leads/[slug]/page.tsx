"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary } from "@/types/kirtan";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";

type LeadResponse = {
  lead: {
    display_name: string;
  };
  kirtans: KirtanSummary[];
  featured?: KirtanSummary | null;
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "MM", label: "Maha Mantra" },
  { key: "BHJ", label: "Bhajan" },
] as const;

export default function LeadPage() {
  const { slug } = useParams<{ slug: string }>();
  const {
    isActive,
    isPlaying,
    isLoading,
    toggle,
    enqueue,
    dequeueById,
    isQueued,
    select,
  } = useAudioPlayer();

  const [data, setData] = useState<LeadResponse | null>(null);
  const [filter, setFilter] = useState<"ALL" | "MM" | "BHJ">("ALL");
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [featured, setFeatured] = useState<KirtanSummary | null>(null);

  useEffect(() => {
    fetchWithStatus(`/api/explore/leads/${slug}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setFeatured(json.featured ?? null);
      });
  }, [slug]);

  const visible =
    data?.kirtans?.filter((k) =>
      filter === "ALL" ? true : k.type === filter,
    ) ?? [];

  const sortedVisible = (() => {
    if (filter === "BHJ") {
      return [...visible].sort((a, b) =>
        (a.title ?? "").localeCompare(b.title ?? "", undefined, {
          sensitivity: "base",
        }),
      );
    }

    if (filter === "MM") {
      return [...visible].sort((a, b) => {
        if (a.recorded_date && b.recorded_date) {
          if (a.recorded_date === b.recorded_date) {
            return b.id.localeCompare(a.id);
          }
          return b.recorded_date.localeCompare(a.recorded_date);
        }
        if (a.recorded_date) return -1;
        if (b.recorded_date) return 1;
        return b.id.localeCompare(a.id);
      });
    }

    return visible;
  })();

  const renderedKirtans = pinnedKirtan
    ? [pinnedKirtan, ...sortedVisible.filter((k) => k.id !== pinnedKirtan.id)]
    : sortedVisible;

  if (!data) {
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
            kirtans={sortedVisible}
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
            isLoading={isLoading()}
            onToggle={() => toggle(featured)}
            onEnqueue={enqueue}
            onDequeue={dequeueById}
            isQueued={isQueued(featured.id)}
          />
        ) : null}

        {/* Filters */}
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`
                  rounded-full px-4 py-1.5 text-xs font-medium transition
                  ${
                    active
                      ? "bg-rose-600 text-white"
                      : "bg-white text-stone-600 border border-stone-200 hover:bg-rose-50"
                  }
                `}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Kirtan list */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Kirtans
          </h2>

          {renderedKirtans.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No kirtans found for this filter.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {renderedKirtans.map((k) => (
                <KirtanListItem
                  key={k.id}
                  kirtan={k}
                  isActive={isActive(k)}
                  isPlaying={isPlaying()}
                  isLoading={isLoading()}
                  onToggle={() => toggle(k)}
                  onEnqueue={enqueue}
                  onDequeue={dequeueById}
                  isQueued={isQueued(k.id)}
                />
              ))}
            </ul>
          )}
        </section>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </main>
    </div>
  );
}
