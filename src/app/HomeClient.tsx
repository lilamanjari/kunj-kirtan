"use client";

import { Suspense, useState } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import type { HomeData } from "@/types/home";
import type { KirtanSummary } from "@/types/kirtan";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import HomeFavoritesStrip from "@/lib/components/HomeFavoritesStrip";
import HomePopularStrip from "@/lib/components/HomePopularStrip";
import HomeRecommendedStrip from "@/lib/components/HomeRecommendedStrip";
import KirtanListItem from "@/lib/components/KirtanListItem";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import SharedKirtanFeature from "@/lib/components/SharedKirtanFeature";
import { greenSurfaceTheme, homePalette } from "@/lib/theme/pagePalettes";
import { radiusClassNames } from "@/lib/theme/radii";
import Image from "next/image";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { useDictionary, useLocale } from "@/lib/i18n/LocaleProvider";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfCalendar,
  sfMusicMicrophone,
  sfMusicNote,
  sfMusicNoteList,
} from "@bradleyhodges/sfsymbols";
import {
  displayHeadingClassName,
  homeSectionEyebrowClassName,
  neutralCircleButtonClassName,
} from "@/lib/theme/componentThemes";
import { formatDateLong, parseDateSafe } from "@/lib/utils/date";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import { getKirtanCardText } from "@/lib/kirtanCardPresentation";

const exploreTileStyles: Record<
  string,
  {
    icon: typeof sfMusicNote;
    customIconSrc?: string;
    customIcon?: "lead-microphone";
    backgroundColor: string;
    iconColor: string;
  }
> = {
  MM: {
    icon: sfMusicNote,
    customIconSrc: "/nitai-gauranga-icon.svg",
    backgroundColor: "var(--theme-page-home-discovery-rose)",
    iconColor: "#b56f57",
  },
  BHJ: {
    icon: sfMusicNoteList,
    customIconSrc: "/harmonium.png",
    backgroundColor: "var(--theme-page-home-discovery-gold)",
    iconColor: "#8b7533",
  },
  LEADS: {
    icon: sfMusicMicrophone,
    backgroundColor: "var(--theme-page-home-discovery-sage)",
    iconColor: "#4f806e",
  },
  OCCASIONS: {
    icon: sfCalendar,
    backgroundColor: "var(--theme-page-home-discovery-blush)",
    iconColor: "#b56553",
  },
};

function formatDiscoverDetail(
  id: string,
  count: number | null,
  fallbackLabel: string,
) {
  if (count === null) {
    return fallbackLabel;
  }

  switch (id) {
    case "MM":
      return `${count} ${count === 1 ? "kirtan" : "kirtans"}`;
    case "BHJ":
      return `${count} ${count === 1 ? "bhajan" : "bhajans"}`;
    case "LEADS":
      return `${count} ${count === 1 ? "singer" : "singers"}`;
    case "OCCASIONS":
      return `${count} festivals and vratas`;
    default:
      return fallbackLabel;
  }
}

function getDaysUntil(dateStr: string | null) {
  const target = parseDateSafe(dateStr);
  if (!target) return null;

  const now = new Date();
  const startOfToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const startOfTarget = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  );

  return Math.max(
    0,
    Math.ceil((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24)),
  );
}

export default function HomeClient({ data }: { data: HomeData }) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const {
    isPlaying,
    isLoading,
    isActive,
    toggle,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
    favorites,
    favoritesLoaded,
    select,
  } = useAudioPlayer();
  const primaryAction = data.primary_action;
  const recentlyAdded = data.recently_added ?? [];
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedKirtan, setSharedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedCardDismissed, setSharedCardDismissed] = useState(false);
  const entryPointLinks: Record<string, string> = {
    MM: "/explore/maha-mantras",
    BHJ: "/explore/bhajans",
    LEADS: "/explore/leads",
    OCCASIONS: "/explore/occasions",
  };
  const renderedRecentlyAdded = pinnedKirtan
    ? [pinnedKirtan, ...recentlyAdded.filter((k) => k.id !== pinnedKirtan.id)]
    : recentlyAdded;
  const shouldHidePrimaryFeatured =
    !!sharedKirtan &&
    !sharedCardDismissed &&
    sharedKirtan.id === primaryAction?.kirtan.id;
  const entryPointTitles: Record<string, string> = {
    MM: dictionary.explore.mahaMantra,
    BHJ: dictionary.explore.bhajans,
    LEADS: dictionary.explore.leadSingers,
    OCCASIONS: dictionary.explore.occasions,
  };
  const entryPointDetails: Record<string, string> = {
    MM: formatDiscoverDetail(
      "MM",
      data.entry_points?.find((item) => item.id === "MM")?.count ?? null,
      "Kirtans",
    ),
    BHJ: formatDiscoverDetail(
      "BHJ",
      data.entry_points?.find((item) => item.id === "BHJ")?.count ?? null,
      "Bhajans",
    ),
    LEADS: formatDiscoverDetail(
      "LEADS",
      data.entry_points?.find((item) => item.id === "LEADS")?.count ?? null,
      "Singers",
    ),
    OCCASIONS: formatDiscoverDetail(
      "OCCASIONS",
      data.entry_points?.find((item) => item.id === "OCCASIONS")?.count ?? null,
      "Festivals & vratas",
    ),
  };
  const currentOccasionEndsInDays = getDaysUntil(
    data.current_occasion?.endsAt ?? null,
  );
  const currentOccasionEndsLabel =
    currentOccasionEndsInDays === null
      ? null
      : currentOccasionEndsInDays === 0
        ? dictionary.home.currentVrataEndsToday
        : dictionary.home.currentVrataEndsIn.replace(
            "{days}",
            String(currentOccasionEndsInDays),
          );
  const currentOccasionEndDate = data.current_occasion?.endsAt
    ? formatDateLong(data.current_occasion.endsAt, "day", locale)
    : null;
  function handleSharedKirtan(kirtan: KirtanSummary) {
    setPinnedKirtan(kirtan);
    setSharedKirtan(kirtan);
    setSharedCardDismissed(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--theme-page-home-bg)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md space-y-6">
        <div className="relative">
          <Image
            src="/KunjKirtan-SrilaGurudeva-Header.jpeg"
            alt="Kunj Kirtan header artwork"
            width={1200}
            height={520}
            priority
            className="h-auto w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[color:var(--theme-page-home-bg)]" />
        </div>
        <div className="-mt-10 space-y-8 px-5">
          <Suspense fallback={null}>
            <KirtanDeepLinkHandler
              kirtans={recentlyAdded}
              onSelect={select}
              isActive={isActive}
              onPin={handleSharedKirtan}
            />
          </Suspense>
          <SharedKirtanFeature
            kirtan={sharedKirtan}
            isActive={sharedKirtan ? isActive(sharedKirtan) : false}
            isPlaying={sharedKirtan ? isPlaying(sharedKirtan) : false}
            isLoading={sharedKirtan ? isLoading(sharedKirtan) : false}
            onToggle={() => {
              if (sharedKirtan) toggle(sharedKirtan);
            }}
            onEnqueue={enqueue}
            onDequeue={dequeueById}
            isQueued={sharedKirtan ? isQueued(sharedKirtan.id) : false}
            onToggleFavorite={toggleFavorite}
            isFavorited={sharedKirtan ? isFavorited(sharedKirtan.id) : false}
            onDismissedChange={setSharedCardDismissed}
          />
          {primaryAction && !shouldHidePrimaryFeatured && (
            <FeaturedKirtanCard
              kirtan={primaryAction.kirtan}
              isActive={isActive(primaryAction.kirtan)}
              isPlaying={isPlaying(primaryAction.kirtan)}
              isLoading={isLoading(primaryAction.kirtan)}
              onToggle={() => toggle(primaryAction.kirtan)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(primaryAction.kirtan.id)}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(primaryAction.kirtan.id)}
              palette={homePalette.featuredCard}
              titleOverride={getKirtanCardText(primaryAction.kirtan).title}
              subtitleOverride={getKirtanCardText(primaryAction.kirtan).subtitle}
            />
          )}

          {data.current_occasion ? (
            <section className="relative">
              <LocalizedLink
                href={`/explore/occasions/${data.current_occasion.slug}`}
                className={`group relative block min-h-[15rem] overflow-hidden border shadow-[0_20px_42px_rgba(116,148,98,0.12)] backdrop-blur-sm transition hover:-translate-y-0.5 ${radiusClassNames.surface}`}
                style={{
                  backgroundColor: "var(--theme-page-home-occasion-surface)",
                  borderColor: "var(--theme-page-home-occasion-border)",
                  boxShadow: `0 20px 42px ${greenSurfaceTheme.shadowColor}`,
                  color: "var(--theme-vrata-title)",
                }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <Image
                    src="/Purushottama-Vrata.png"
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover object-[76%_center]"
                  />
                </div>
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(106deg, #EEF3E6 0%, #F3F7EE 43%, rgba(243,247,238,0.45) 61%, rgba(243,247,238,0.14) 74%, rgba(243,247,238,0) 86%)",
                  }}
                />

                <div className="relative flex min-h-[15rem] items-end justify-between gap-4 px-5 py-5">
                  <div className="flex min-h-full max-w-[66%] flex-1 flex-col justify-between">
                    <p
                      className={`text-[0.95rem] uppercase leading-none tracking-[0.16em] text-(--theme-vrata-label) ${displayHeadingClassName}`}
                    >
                      {data.current_occasion.header ??
                        dictionary.home.currentVrata}
                    </p>
                    <h2
                      className={`mt-3 text-[1.8rem] leading-[0.94] text-[color:var(--theme-vrata-title)] ${displayHeadingClassName}`}
                    >
                      {data.current_occasion.name}
                    </h2>
                    <p className="mt-2 max-w-[14rem] text-sm font-medium leading-[1.45] text-[color:var(--theme-vrata-text)]">
                      {data.current_occasion.subtitle ??
                        dictionary.home.currentVrataSubtitle}
                    </p>

                    {currentOccasionEndsLabel ? (
                      <div className="mt-5 flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--theme-vrata-title)] text-white shadow-[0_10px_22px_rgba(63,94,47,0.24)]">
                          <SFIcon
                            icon={sfCalendar}
                            className="h-5.5 w-5.5 opacity-100"
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[1.05rem] font-medium text-[color:var(--theme-vrata-text)]">
                            {currentOccasionEndsLabel}
                          </p>
                          {currentOccasionEndDate ? (
                            <p className="mt-0.5 text-sm text-[color:var(--theme-vrata-text)]">
                              {currentOccasionEndDate}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <span
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-white/92 text-xl backdrop-blur-sm transition group-hover:translate-x-0.5"
                    style={{
                      borderColor: greenSurfaceTheme.buttonBorderColor,
                      color: greenSurfaceTheme.buttonTextColor,
                      boxShadow: `0 8px 18px ${greenSurfaceTheme.buttonShadowColor}`,
                    }}
                  >
                    →
                  </span>
                </div>
              </LocalizedLink>
            </section>
          ) : null}

          <section>
            <h2 className={`px-1 ${homeSectionEyebrowClassName}`}>
              {dictionary.common.discover}
            </h2>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {data.entry_points?.map((e) => {
                const href = entryPointLinks[e.id];
                const tileStyle = exploreTileStyles[e.id];

                if (href) {
                  return (
                    <LocalizedLink
                      key={e.id}
                      href={href}
                      className={`group relative flex min-h-[7.75rem] flex-col justify-between overflow-hidden border px-4 py-3 text-left shadow-[0_12px_28px_rgba(156,113,93,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(156,113,93,0.12)] ${radiusClassNames.tile}`}
                      style={{
                        backgroundColor: tileStyle?.backgroundColor,
                        borderColor: "var(--theme-page-home-border)",
                      }}
                    >
                      {tileStyle?.customIconSrc ? (
                        <Image
                          src={tileStyle.customIconSrc}
                          alt=""
                          width={32}
                          height={20}
                          className={`w-auto self-start ${
                            e.id === "BHJ"
                              ? "-ml-1 -mt-2 h-12 mix-blend-multiply"
                              : e.id === "LEADS"
                                ? "h-9 opacity-85"
                                : "h-7"
                          }`}
                        />
                      ) : (
                        <SFIcon
                          icon={tileStyle?.icon ?? sfMusicNote}
                          className={
                            e.id === "OCCASIONS" ? "h-7 w-7" : "h-8 w-8"
                          }
                          style={{ color: tileStyle?.iconColor }}
                        />
                      )}
                      <div className="relative mt-4 flex w-full items-end justify-between gap-3">
                        <div className="min-w-0">
                          <span
                            className={`block max-w-[11ch] text-[1.22rem] leading-[0.98] text-[color:var(--theme-page-home-text)] ${displayHeadingClassName}`}
                          >
                            {entryPointTitles[e.id] ?? e.label}
                          </span>
                          <span className="mt-1.5 block max-w-[10ch] text-[0.84rem] leading-[1.2] text-[color:var(--theme-page-home-muted)]">
                            {entryPointDetails[e.id]}
                          </span>
                        </div>
                        <span
                          className={`h-10 w-10 shrink-0 ${neutralCircleButtonClassName}`}
                        >
                          →
                        </span>
                      </div>
                    </LocalizedLink>
                  );
                }

                return (
                  <button
                    key={e.id}
                    disabled
                    className={`flex min-h-[8.75rem] items-center justify-center border border-[#e6d4cc] bg-white/75 px-4 py-4 text-center text-[1.48rem] font-semibold text-[#9d8a84] ${radiusClassNames.tile}`}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-3">
            <HomeFavoritesStrip
              favorites={favorites}
              loaded={favoritesLoaded}
            />
            <HomeRecommendedStrip kirtans={data.recommended ?? []} />
            <HomePopularStrip kirtans={data.popular ?? []} />
          </div>

          <section>
            <h2 className={homeSectionEyebrowClassName}>
              {dictionary.common.recentlyAdded}
            </h2>

            <ul className="mt-3 space-y-0">
              {renderedRecentlyAdded.map((k) => {
                return (
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
                    titleOverride={getKirtanCardText(k).title}
                    subtitleOverride={getKirtanCardText(k).subtitle}
                    useShortDate
                    truncateSangaAt={10}
                    stackActionsOnMobile
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
                );
              })}
            </ul>
          </section>

          <section className="pb-5 text-center">
            <LocalizedLink
              href="/about"
              className={`mt-3 inline-flex border border-white/70 bg-white/78 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b6a5f] shadow-sm backdrop-blur-sm transition hover:bg-white ${radiusClassNames.button}`}
            >
              {dictionary.common.aboutKunjKirtan}
            </LocalizedLink>
          </section>
        </div>
      </main>
    </div>
  );
}
