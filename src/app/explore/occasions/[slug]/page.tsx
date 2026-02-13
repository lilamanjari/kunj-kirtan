"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary } from "@/types/kirtan";

type OccasionResponse = {
  tag: {
    id: string;
    name: string;
    slug: string;
  };
  kirtans: KirtanSummary[];
};

export default function OccasionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isActive, isPlaying, isLoading, toggle } = useAudioPlayer();

  const [data, setData] = useState<OccasionResponse | null>(null);

  useEffect(() => {
    fetch(`/api/explore/occasions/${slug}`)
      .then((res) => res.json())
      .then(setData);
  }, [slug]);

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
                key={`occasion-loading-${idx}`}
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
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Occasion
          </p>
          <h1 className="text-2xl font-semibold font-script">
            {data.tag.name}
          </h1>
        </header>

        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Kirtans
          </h2>

          {data.kirtans.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No kirtans found for this occasion.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.kirtans.map((k) => (
                <KirtanListItem
                  key={k.id}
                  kirtan={k}
                  isActive={isActive(k)}
                  isPlaying={isPlaying()}
                  isLoading={isLoading()}
                  onToggle={() => toggle(k)}
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
