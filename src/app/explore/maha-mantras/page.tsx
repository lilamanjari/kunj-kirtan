"use client";

import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import RecentlyAddedItem from "@/lib/components/RecentlyAddedItem";

export default function MahaMantrasPage() {
  const [mantras, setMantras] = useState<KirtanSummary[]>([]);
  const [search, setSearch] = useState("");
  const [durationFilter, setDurationFilter] = useState("ALL");

  const { toggle, isActive, isPlaying, isLoading } = useAudioPlayer();

  useEffect(() => {
    const url = search
      ? `/api/explore/maha-mantras?search=${encodeURIComponent(search)}`
      : `/api/explore/maha-mantras`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setMantras(data.mantras ?? []));
  }, [search]);

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

  const visibleMantras = mantras.filter((m) => {
    if (durationFilter === "ALL") return true;

    const duration = m.duration_seconds;
    if (typeof duration !== "number" || !Number.isFinite(duration)) return false;

    const range = durationRanges[durationFilter];
    if (!range) return true;

    if (range.min !== null && duration < range.min) return false;
    if (range.max !== null && duration > range.max) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-md px-5 py-6 space-y-6">
        <h1 className="text-xl font-medium">Maha Mantras</h1>

        <input
          type="text"
          placeholder="Search by lead singer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
        />

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Duration
          </p>
          <select
            value={durationFilter}
            onChange={(e) => setDurationFilter(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
          >
            {Object.entries(durationRanges).map(([key, range]) => (
              <option key={key} value={key}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <ul className="space-y-3">
          {visibleMantras.map((m) => {
            return (
              <RecentlyAddedItem
                key={m.id}
                kirtan={m}
                isActive={isActive(m)}
                isPlaying={isPlaying()}
                isLoading={isLoading()}
                onToggle={() => toggle(m)}
              />
            );
          })}
        </ul>
      </main>
    </div>
  );
}
