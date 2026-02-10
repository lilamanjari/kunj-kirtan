"use client";

import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { KirtanSummary } from "@/types/kirtan";
import RecentlyAddedItem from "@/lib/components/RecentlyAddedItem";

type BhajanItem = KirtanSummary;

export default function BhajansPage() {
  const [bhajans, setBhajans] = useState<BhajanItem[]>([]);
  const [search, setSearch] = useState("");
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const { toggle, isActive, isPlaying, isLoading } = useAudioPlayer();

  useEffect(() => {
    const url = search
      ? `/api/explore/bhajans?search=${encodeURIComponent(search)}`
      : `/api/explore/bhajans`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setBhajans(data.bhajans ?? []);
        setHasFetchedOnce(true);
      });
  }, [search]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-md px-5 py-6 space-y-6">
        <h1 className="text-xl font-medium">Bhajans</h1>

        <input
          type="text"
          placeholder="Search bhajans…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-300"
        />

        <ul className="space-y-3">
          {bhajans.length === 0 && hasFetchedOnce ? (
            <li className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-500">
              No Bhajans match your search.
            </li>
          ) : (
            bhajans.map((b) => {
              return (
                <RecentlyAddedItem
                  key={b.id}
                  kirtan={b}
                  isActive={isActive(b)}
                  isPlaying={isPlaying()}
                  isLoading={isLoading()}
                  onToggle={() => toggle(b)}
                />
              );
            })
          )}
        </ul>
      </main>
    </div>
  );
}
