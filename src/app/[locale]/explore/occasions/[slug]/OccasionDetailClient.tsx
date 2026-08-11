"use client";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlaySquareStackFill,
  sfShuffleCircle,
} from "@bradleyhodges/sfsymbols";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import type { KirtanSummary } from "@/types/kirtan";
import type { OccasionResponse } from "@/types/occasions";
import SubpageHeader from "@/lib/components/SubpageHeader";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import { occasionsPalette } from "@/lib/theme/pagePalettes";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import { getKirtanCardText, getMixedListItemDisplayProps } from "@/lib/kirtanCardPresentation";

export default function OccasionDetailClient({
  initialData,
}: {
  initialData: OccasionResponse;
}) {
  const dictionary = useDictionary();
  const {
    isActive,
    isPlaying,
    isLoading,
    toggle,
    playCollection,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
  } = useAudioPlayer();

  const visible = initialData.kirtans ?? [];
  const featured = initialData.featured ?? null;
  const bhajans = visible.filter((k) => k.type === "BHJ");
  const mahaMantras = visible.filter((k) => k.type === "MM");

  function renderKirtanList(kirtans: KirtanSummary[]) {
    return (
      <ul className="mt-2 space-y-0">
        {kirtans.map((k) => (
          <KirtanListItem
            key={k.id}
            kirtan={k}
            leadingVisual={
              <LeadSingerAvatar
                name={k.lead_singer}
                imageUrl={k.lead_singer_image_url}
                alt={k.lead_singer_image_alt}
              />
            }
            {...getMixedListItemDisplayProps(k)}
            isActive={isActive(k)}
            isPlaying={isPlaying(k)}
            isLoading={isLoading(k)}
            onToggle={() => toggle(k)}
            onEnqueue={enqueue}
            onDequeue={dequeueById}
            isQueued={isQueued(k.id)}
            onToggleFavorite={toggleFavorite}
            isFavorited={isFavorited(k.id)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
        <SubpageHeader
          title={undefined}
          subtitle={undefined}
          backLabel={dictionary.explore.occasionsBackLabel}
          backHref="/explore/occasions"
        />

        {featured ? (
          <div className="relative z-20 -mt-6">
            <FeaturedKirtanCard
              kirtan={featured}
              isActive={isActive(featured)}
              isPlaying={isPlaying(featured)}
              isLoading={isLoading(featured)}
              onToggle={() => toggle(featured)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(featured.id)}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(featured.id)}
              contextLine={
                featured.person_tag
                  ? `${dictionary.explore.inHonorOf} ${featured.person_tag}`
                  : undefined
              }
              palette={occasionsPalette.featuredCard}
              titleOverride={getKirtanCardText(featured).title}
              subtitleOverride={getKirtanCardText(featured).subtitle}
            />
          </div>
        ) : null}

        <section>
          <div className="flex items-center justify-between gap-3">
            {visible.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playCollection(visible)}
                  aria-label={dictionary.actions.playAll}
                  title={dictionary.actions.playAll}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e7d7ce] bg-white text-[#9a7566] shadow-sm hover:bg-[#fff8f4]"
                >
                  <SFIcon icon={sfPlaySquareStackFill} className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => playCollection(visible, { shuffle: true })}
                  aria-label={dictionary.actions.shuffle}
                  title={dictionary.actions.shuffle}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e7d8] bg-white text-[#739675] shadow-sm hover:bg-[#f5fbf5]"
                >
                  <SFIcon icon={sfShuffleCircle} className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[#e7d7ce] bg-white/88 px-4 py-6 text-center text-sm text-[#96786b]">
              {dictionary.explore.noKirtansFound}
            </p>
          ) : (
            <div className="mt-3 space-y-5">
              {bhajans.length > 0 ? (
                <section>
                  <h3 className="px-1 text-sm font-semibold text-[#8c5c4a]">
                    {dictionary.explore.bhajans}
                  </h3>
                  {renderKirtanList(bhajans)}
                </section>
              ) : null}

              {mahaMantras.length > 0 ? (
                <section>
                  <h3 className="px-1 text-sm font-semibold text-[#8c5c4a]">
                    {dictionary.explore.mahaMantra}
                  </h3>
                  {renderKirtanList(mahaMantras)}
                </section>
              ) : null}
            </div>
          )}
        </section>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </main>
    </div>
  );
}
