"use client";

import { Suspense, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { HomeData } from "@/types/home";
import type { KirtanSummary } from "@/types/kirtan";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import Link from "next/link";

export default function HomeClient({ data }: { data: HomeData }) {
  const { isPlaying, isLoading, isActive, toggle, enqueue, isQueued, select } =
    useAudioPlayer();
  const primaryAction = data.primary_action;
  const [recentlyAdded, setRecentlyAdded] = useState(
    () => data.recently_added ?? [],
  );
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const entryPointLinks: Record<string, string> = {
    MM: "/explore/maha-mantras",
    BHJ: "/explore/bhajans",
    LEADS: "/explore/leads",
    OCCASIONS: "/explore/occasions",
  };
  const renderedRecentlyAdded = pinnedKirtan
    ? [pinnedKirtan, ...recentlyAdded.filter((k) => k.id !== pinnedKirtan.id)]
    : recentlyAdded;

  return (
    <div className="relative min-h-screen text-stone-900 bg-[radial-gradient(circle_at_top,_#ffe4ef_0%,_#fff6fa_45%,_#f8fafc_100%)] overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 h-72 w-72 bg-[url('/floral-corner.png')] bg-no-repeat bg-right-top opacity-50"
        style={{
          backgroundSize: "320px auto",
          right: "max(0px, calc(50% - 14rem + 8px))",
        }}
      />
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
        <div className="pointer-events-none absolute -top-10 left-6 h-28 w-28 rounded-full bg-rose-300/40 blur-3xl" />

        <header className="relative space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
            Daily kirtan
          </p>
          <div className="inline-flex flex-col">
            <h1 className="font-script text-3xl font-semibold leading-tight text-stone-900">
              Kunj Kirtan
            </h1>
            <span className="mt-1 h-0.5 w-24 rounded-full bg-emerald-400/80" />
          </div>
          <p className="text-sm text-stone-500">
            Sacred sounds, lovingly curated.
          </p>
        </header>
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={recentlyAdded}
            onSelect={select}
            isActive={isActive}
            onPin={setPinnedKirtan}
          />
        </Suspense>
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
                    className="rounded-xl border border-rose-100 bg-white/80 py-3 text-center text-sm font-medium shadow-sm hover:bg-rose-50/60 transition"
                  >
                    {e.id === "MM" ? "Maha Mantra" : e.label}
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
            {renderedRecentlyAdded.map((k) => {
              return (
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
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
