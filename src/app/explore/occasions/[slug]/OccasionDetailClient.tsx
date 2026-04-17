"use client";

import { Suspense, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary } from "@/types/kirtan";
import type { OccasionPersonGroup, OccasionResponse } from "@/types/occasions";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import SubpageHeader from "@/lib/components/SubpageHeader";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";

export default function OccasionDetailClient({
  initialData,
}: {
  initialData: OccasionResponse;
}) {
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
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);

  const visible = initialData.kirtans ?? [];
  const featured = initialData.featured ?? null;
  const pinnedId = pinnedKirtan?.id ?? null;
  const isPersonFocusedOccasion =
    initialData.tag.slug === "avirbhava" || initialData.tag.slug === "tirobhava";
  const personGroups = (initialData.person_groups ?? []).map(
    (group): OccasionPersonGroup => ({
      person_name: group.person_name,
      kirtans: group.kirtans.filter((k) => k.id !== pinnedId),
    }),
  ).filter((group) => group.kirtans.length > 0);
  const ungroupedKirtans = (initialData.ungrouped_kirtans ?? visible)
    .filter((k) => k.id !== pinnedId);
  const flatKirtans = visible.filter((k) => k.id !== pinnedId);
  const hasGroupedPeople = personGroups.length > 0;

  function renderKirtanList(kirtans: KirtanSummary[]) {
    return (
      <ul className="mt-3 space-y-3">
        {kirtans.map((k) => (
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
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={visible}
            onSelect={select}
            isActive={isActive}
            onPin={setPinnedKirtan}
          />
        </Suspense>
        <SubpageHeader
          title={initialData.tag.name}
          backLabel="Occasions"
          backHref="/explore/occasions"
        />

        {featured ? (
          <div className="relative z-20 -mt-10">
            <FeaturedKirtanCard
              kirtan={featured}
              isActive={isActive(featured)}
              isPlaying={isPlaying()}
              isLoading={isLoading()}
              onToggle={() => toggle(featured)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(featured.id)}
              contextLine={
                isPersonFocusedOccasion && featured.person_tag
                  ? `In honor of ${featured.person_tag}`
                  : undefined
              }
            />
          </div>
        ) : null}

        <section>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Kirtans
          </h2>

          {pinnedKirtan ? (
            <div className="mt-4">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9b6a5f]">
                Selected
              </p>
              {renderKirtanList([pinnedKirtan])}
            </div>
          ) : null}

          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No kirtans found for this occasion.
            </p>
          ) : isPersonFocusedOccasion && hasGroupedPeople ? (
            <div className="mt-4 space-y-6">
              {personGroups.map((group) => (
                <section key={group.person_name}>
                  <h3 className="px-1 text-sm font-semibold text-[#8c5c4a]">
                    In honor of {group.person_name}
                  </h3>
                  {renderKirtanList(group.kirtans)}
                </section>
              ))}

              {ungroupedKirtans.length > 0 ? (
                <section>
                  <h3 className="px-1 text-sm font-semibold text-[#8c5c4a]">
                    Other kirtans
                  </h3>
                  {renderKirtanList(ungroupedKirtans)}
                </section>
              ) : null}
            </div>
          ) : (
            renderKirtanList(flatKirtans)
          )}
        </section>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </main>
    </div>
  );
}
