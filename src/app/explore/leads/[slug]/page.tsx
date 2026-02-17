"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary } from "@/types/kirtan";
import { useKirtanDeepLink } from "@/lib/hooks/useKirtanDeepLink";

type LeadResponse = {
  lead: {
    display_name: string;
  };
  kirtans: KirtanSummary[];
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "MM", label: "Maha Mantra" },
  { key: "BHJ", label: "Bhajan" },
] as const;

export default function LeadPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isActive, isPlaying, isLoading, toggle, enqueue, isQueued, select } = useAudioPlayer();

  const [data, setData] = useState<LeadResponse | null>(null);
  const [filter, setFilter] = useState<"ALL" | "MM" | "BHJ">("ALL");

  useEffect(() => {
    fetch(`/api/explore/leads/${slug}`)
      .then((res) => res.json())
      .then(setData);
  }, [slug]);

  const visible =
    data?.kirtans?.filter((k) =>
      filter === "ALL" ? true : k.type === filter,
    ) ?? [];

  const pinnedKirtan = useKirtanDeepLink({
    kirtans: visible,
    onSelect: select,
    isActive,
  });
  const renderedKirtans = pinnedKirtan
    ? [pinnedKirtan, ...visible.filter((k) => k.id !== pinnedKirtan.id)]
    : visible;

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffe4ef_0%,_#fff6fa_45%,_#f8fafc_100%)] text-stone-900">
      <main className="relative mx-auto max-w-md px-5 py-6 space-y-8">
        <div className="pointer-events-none absolute -top-10 left-6 h-28 w-28 rounded-full bg-rose-300/40 blur-3xl" />
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-medium uppercase tracking-wide text-rose-400 hover:text-rose-500"
            >
              Home
            </Link>
            <span className="text-xs uppercase tracking-wide text-stone-500">
              Lead singer
            </span>
            <span className="w-10" />
          </div>
          <h1 className="text-2xl font-semibold font-script">
            {data.lead.display_name}
          </h1>
        </header>

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
