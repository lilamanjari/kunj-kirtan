"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { HomeData } from "@/types/home";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import RecentlyAddedItem from "@/lib/components/RecentlyAddedItem";
import Link from "next/link";

export default function HomeClient({ data }: { data: HomeData }) {
  const { isPlaying, isLoading, isActive, toggle } = useAudioPlayer();

  const primaryAction = data.primary_action;
  const entryPointLinks: Record<string, string> = {
    MM: "/explore/maha-mantras",
    BHJ: "/explore/bhajans",
    LEADS: "/explore/leads",
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto max-w-md px-5 py-6 space-y-8">
        <h1 className="text-xl font-medium">Kunj Kirtan</h1>
        {primaryAction && (
          <FeaturedKirtanCard
            kirtan={primaryAction.kirtan}
            isActive={isActive(primaryAction.kirtan)}
            isPlaying={isPlaying()}
            isLoading={isLoading()}
            onToggle={() => toggle(primaryAction.kirtan)}
          />
        )}

        {data.continue_listening && (
          <section>
            <h2 className="text-sm uppercase opacity-60">Continue Listening</h2>
            <div className="mt-2">
              {data.continue_listening.type} —{" "}
              {data.continue_listening.lead_singer}
            </div>
          </section>
        )}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Explore
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {data.entry_points?.map((e) => {
              const href = entryPointLinks[e.id];

              if (href) {
                return (
                  <Link
                    key={e.id}
                    href={href}
                    className="rounded-xl border border-stone-200 bg-white py-3 text-center text-sm font-medium shadow-sm hover:bg-stone-50 transition"
                  >
                    {e.label}
                  </Link>
                );
              }

              return (
                <button
                  key={e.id}
                  disabled
                  className="rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-400 shadow-sm"
                >
                  {e.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Recently Added
          </h2>

          <ul className="mt-3 space-y-3">
            {data.recently_added?.map((k) => {
              return (
                <RecentlyAddedItem
                  key={k.id}
                  kirtan={k}
                  isActive={isActive(k)}
                  isPlaying={isPlaying()}
                  isLoading={isLoading()}
                  onToggle={() => toggle(k)}
                />
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
