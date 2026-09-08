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
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import { occasionsPalette } from "@/lib/theme/pagePalettes";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import {
  getKirtanCardText,
  getMixedListItemDisplayProps,
} from "@/lib/kirtanCardPresentation";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { radiusClassNames } from "@/lib/theme/radii";
import { displayHeadingClassName } from "@/lib/theme/componentThemes";
import {
  appendImageVersion,
  buildBucketImageUrl,
  buildTransformedImageUrl,
} from "@/lib/media";

const OCCASION_ART_VERSION = "4";

function OccasionContextHeader({
  name,
  description,
  slug,
  backLabel,
  homeLabel,
}: {
  name: string;
  description: string | null;
  slug: string;
  backLabel: string;
  homeLabel: string;
}) {
  const artSrc = appendImageVersion(
    buildTransformedImageUrl(buildBucketImageUrl(`page-art/${slug}.png`), {
      width: 320,
      height: 320,
      fit: "cover",
      format: "png",
    }),
    OCCASION_ART_VERSION,
  );

  return (
    <header className="relative -mx-5 -mt-6 h-[11.5rem] overflow-visible">
      <div
        className="absolute inset-0"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
        }}
      >
        <img
          src="/KunjKirtansSubheader.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "center 42%" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,243,0.03)_0%,rgba(255,248,243,0)_48%,rgba(246,228,222,0.74)_82%,rgba(246,228,222,0.97)_100%)]" />
      </div>

      <LocalizedLink
        href="/"
        aria-label={homeLabel}
        className={`absolute right-4 top-0 z-10 block h-20 w-[58%] sm:h-24 ${radiusClassNames.headerCorner}`}
      />
      <div className="absolute inset-x-5 top-3 z-20 sm:top-4">
        <LocalizedLink
          href="/explore/occasions"
          className={`inline-flex border border-white/70 bg-white/78 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b6a5f] shadow-sm backdrop-blur-sm hover:bg-white ${radiusClassNames.button}`}
        >
          {`\u2039 ${backLabel}`}
        </LocalizedLink>
      </div>

      <div className="absolute bottom-[-3rem] left-[-0.5rem] z-20 h-32 w-32 overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(255,251,248,0.98)_0%,rgba(247,239,233,0.98)_100%)] shadow-[0_10px_12px_rgba(116,75,57,0.16),inset_0_0_0_1px_rgba(236,220,210,0.72)] sm:left-0 sm:h-32 sm:w-32">
        <img
          src={artSrc ?? undefined}
          alt=""
          className="h-full w-full object-cover opacity-90"
        />
      </div>
      <div className="absolute bottom-[-2rem] left-[8rem] right-4 z-20 sm:left-[8.8rem]">
        <h1
          className={`${displayHeadingClassName} text-[clamp(1.7rem,6.1vw,1.8rem)] leading-[0.9] text-[#77463b] drop-shadow-[0_1px_10px_rgba(255,248,243,0.85)]`}
          title={name}
        >
          {name}
        </h1>
        {description ? (
          <p className="mt-1 font-[family:var(--font-inter)] text-xs leading-snug text-[#7b5a53]">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}

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
  const collectionControls =
    visible.length > 1 ? (
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
    ) : null;

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
                focusX={k.lead_singer_image_focus_x}
                focusY={k.lead_singer_image_focus_y}
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
        <OccasionContextHeader
          name={initialData.tag.name}
          description={initialData.tag.description}
          slug={initialData.tag.slug}
          backLabel={dictionary.explore.occasionsBackLabel}
          homeLabel={dictionary.actions.goToHomePage}
        />

        {featured ? (
          <div className="relative z-10 pt-10">
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

        <section className={featured ? undefined : "pt-2"}>
          {visible.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-[#e7d7ce] bg-white/88 px-4 py-6 text-center text-sm text-[#96786b]">
              {dictionary.explore.noKirtansFound}
            </p>
          ) : (
            <div className="mt-3 space-y-5">
              {bhajans.length > 0 ? (
                <section>
                  <div className="flex items-center justify-between gap-3 px-1">
                    <h3 className="text-sm font-semibold text-[#8c5c4a]">
                      {dictionary.explore.bhajans}
                    </h3>
                    {collectionControls}
                  </div>
                  {renderKirtanList(bhajans)}
                </section>
              ) : null}

              {mahaMantras.length > 0 ? (
                <section>
                  <div className="flex items-center justify-between gap-3 px-1">
                    <h3 className="text-sm font-semibold text-[#8c5c4a]">
                      {dictionary.explore.mahaMantra}
                    </h3>
                    {bhajans.length === 0 ? collectionControls : null}
                  </div>
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
