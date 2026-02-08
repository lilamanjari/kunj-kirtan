"use client";

import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import RecentlyAddedItem from "@/lib/components/RecentlyAddedItem";

export default function MahaMantrasPage() {
  const [mantras, setMantras] = useState<KirtanSummary[]>([]);
  const [search, setSearch] = useState("");

  const { toggle, isActive, isPlaying, isLoading } = useAudioPlayer();

  useEffect(() => {
    const url = search
      ? `/api/explore/maha-mantras?search=${encodeURIComponent(search)}`
      : `/api/explore/maha-mantras`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setMantras(data.mantras ?? []));
  }, [search]);

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

        <ul className="space-y-3">
          {mantras.map((m) => {
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
