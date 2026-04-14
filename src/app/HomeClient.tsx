"use client";

import { Suspense, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { HomeData } from "@/types/home";
import type { KirtanSummary } from "@/types/kirtan";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import Link from "next/link";
import Image from "next/image";

export default function HomeClient({ data }: { data: HomeData }) {
  const {
    isPlaying,
    isLoading,
    isActive,
    toggle,
    enqueue,
    dequeueById,
    isQueued,
    select,
  } = useAudioPlayer();
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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md space-y-6">
        <div className="relative">
          <Image
            src="/Kunj%20Kirtan%20Header.jpg"
            alt="Kunj Kirtan header artwork"
            width={1200}
            height={520}
            priority
            className="h-auto w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-[#f2cdc4]/42 via-55% to-[#f6e4de]" />
        </div>
        <div className="px-5 space-y-8 -mt-12">
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
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(primaryAction.kirtan.id)}
              tone="home"
            />
          )}

          {data.continue_listening && (
            <section>
              <h2 className="text-sm uppercase opacity-60">
                Continue Listening
              </h2>
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
                    onDequeue={dequeueById}
                    isQueued={isQueued(k.id)}
                  />
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
