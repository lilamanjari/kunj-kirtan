"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfBook,
  sfPlaySquareStackFill,
  sfShuffleCircle,
} from "@bradleyhodges/sfsymbols";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import KirtanListItem from "@/lib/components/KirtanListItem";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import type { KirtanSummary, KirtanType } from "@/types/kirtan";
import type { LeadListState, LeadResponse } from "@/types/leads";
import KirtanDeepLinkHandler from "@/lib/components/KirtanDeepLinkHandler";
import SharedKirtanFeature from "@/lib/components/SharedKirtanFeature";
import { fetchWithStatus } from "@/lib/net/fetchWithStatus";
import LeadFeaturedKirtanCard from "@/lib/components/LeadFeaturedKirtanCard";
import SubpageHeader from "@/lib/components/SubpageHeader";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import {
  appendImageVersion,
  buildBucketImageUrl,
  buildTransformedImageUrl,
} from "@/lib/media";
import { displayHeadingClassName } from "@/lib/theme/componentThemes";
import { OTHER_LEAD_ID } from "@/lib/leadConstants";

function getLeadPageListTitle(kirtan: KirtanSummary) {
  if (kirtan.sequence_num) {
    return `${kirtan.title} #${kirtan.sequence_num}`;
  }

  return kirtan.title;
}

function getOtherLeadsMahaMantraSubtitle(kirtan: KirtanSummary) {
  if (kirtan.sequence_num) {
    return `${kirtan.title} #${kirtan.sequence_num}`;
  }

  return kirtan.title;
}

function getRecordedYear(kirtan: KirtanSummary) {
  return kirtan.recorded_date?.slice(0, 4) || "Undated";
}

type KirtanGroup = {
  key: string;
  label: string | null;
  items: KirtanSummary[];
};

export default function LeadPageClient({
  slug,
  initialData,
}: {
  slug: string;
  initialData: LeadResponse;
}) {
  const dictionary = useDictionary();
  const {
    isActive,
    isPlaying,
    isLoading: isAudioLoading,
    toggle,
    playCollection,
    enqueue,
    dequeueById,
    isQueued,
    toggleFavorite,
    isFavorited,
    select,
  } = useAudioPlayer();
  const filters: { key: KirtanType; label: string }[] = [
    { key: "MM", label: dictionary.explore.mahaMantra },
    { key: "BHJ", label: dictionary.explore.bhajans },
    { key: "HK", label: dictionary.explore.hariKatha },
  ];

  const [listsByType, setListsByType] = useState<
    Partial<Record<KirtanType, LeadListState>>
  >(
    initialData.active_type
      ? {
          [initialData.active_type]: {
            kirtans: initialData.kirtans ?? [],
            has_more: Boolean(initialData.has_more),
            next_cursor: initialData.next_cursor ?? null,
          },
        }
      : {},
  );
  const [activeType, setActiveType] = useState<KirtanType | null>(
    initialData.active_type ?? null,
  );
  const [pinnedKirtan, setPinnedKirtan] = useState<KirtanSummary | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeType) return;
    if (listsByType[activeType]) return;

    fetchWithStatus(
      `/api/explore/leads/${slug}/kirtans?lead_id=${initialData.lead.id}&type=${activeType}&limit=20`,
    )
      .then((res) => res.json())
      .then((json) => {
        setListsByType((prev) => ({
          ...prev,
          [activeType]: {
            kirtans: json.kirtans ?? [],
            has_more: Boolean(json.has_more),
            next_cursor: json.next_cursor ?? null,
          },
        }));
      });
  }, [activeType, initialData.lead.id, listsByType, slug]);

  useEffect(() => {
    const activeList = activeType ? listsByType[activeType] : null;
    if (!activeList?.has_more || isLoadingMore) return;
    if (!activeType) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || !activeList.next_cursor) return;

        setIsLoadingMore(true);
        const params = new URLSearchParams();
        params.set("lead_id", initialData.lead.id);
        params.set("type", activeType);
        params.set("limit", "20");

        if ("title" in activeList.next_cursor) {
          params.set("cursor_title", activeList.next_cursor.title);
          params.set("cursor_id", activeList.next_cursor.id);
        } else {
          if (activeList.next_cursor.recorded_date) {
            params.set(
              "cursor_recorded_date",
              activeList.next_cursor.recorded_date,
            );
          }
          params.set("cursor_id", activeList.next_cursor.id);
        }

        fetchWithStatus(
          `/api/explore/leads/${slug}/kirtans?${params.toString()}`,
        )
          .then((res) => res.json())
          .then((json) => {
            setListsByType((prev) => ({
              ...prev,
              [activeType]: {
                kirtans: [
                  ...(prev[activeType]?.kirtans ?? []),
                  ...(json.kirtans ?? []),
                ],
                has_more: Boolean(json.has_more),
                next_cursor: json.next_cursor ?? null,
              },
            }));
          })
          .finally(() => setIsLoadingMore(false));
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeType, initialData.lead.id, isLoadingMore, listsByType, slug]);

  const visibleFilters = filters.filter(
    (filter) => (initialData.counts?.[filter.key] ?? 0) > 0,
  );
  const showTabs = visibleFilters.length > 1;
  const visible = useMemo(
    () => (activeType ? (listsByType[activeType]?.kirtans ?? []) : []),
    [activeType, listsByType],
  );
  const isListLoading = Boolean(activeType && !listsByType[activeType]);
  const featuredKirtan = initialData.featured ?? null;
  const renderedKirtans = useMemo(
    () =>
      pinnedKirtan
        ? [pinnedKirtan, ...visible.filter((k) => k.id !== pinnedKirtan.id)]
        : visible,
    [pinnedKirtan, visible],
  );
  const [sharedKirtan, setSharedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedCardDismissed, setSharedCardDismissed] = useState(false);
  const hasVisibleSharedCard = !!sharedKirtan && !sharedCardDismissed;
  const shouldHideFeatured =
    hasVisibleSharedCard && sharedKirtan.id === featuredKirtan?.id;
  const isOtherLeadView = initialData.lead.id === OTHER_LEAD_ID;

  function handleSharedKirtan(kirtan: KirtanSummary) {
    setPinnedKirtan(kirtan);
    setSharedKirtan(kirtan);
    setSharedCardDismissed(false);
  }

  const groupedKirtans = useMemo(() => {
    if (activeType === "BHJ") {
      return [
        {
          key: "alphabetical",
          label: null,
          items: renderedKirtans,
        },
      ] satisfies KirtanGroup[];
    }

    const groups: KirtanGroup[] = [];
    const byYear = new Map<string, KirtanSummary[]>();

    for (const kirtan of renderedKirtans) {
      const year = getRecordedYear(kirtan);
      const items = byYear.get(year) ?? [];
      items.push(kirtan);
      byYear.set(year, items);
    }

    for (const [year, items] of byYear) {
      groups.push({ key: year, label: year, items });
    }

    return groups;
  }, [activeType, renderedKirtans]);
  const leadSingerHeaderImageSrc = useMemo(() => {
    const transformedUrl = buildTransformedImageUrl(
      buildBucketImageUrl("page-art/leadsingerpageheader.png"),
      {
        width: 1200,
        height: 380,
        fit: "cover",
        format: "png",
        quality: 82,
      },
    );

    return appendImageVersion(transformedUrl, "2") ?? undefined;
  }, []);
  const otherLeadHeroImageSrc = useMemo(() => {
    if (!isOtherLeadView) return undefined;

    const transformedUrl = buildTransformedImageUrl(
      buildBucketImageUrl("page-art/other-lead-singers.png"),
      {
        width: 560,
        height: 720,
        fit: "cover",
        format: "png",
        quality: 82,
      },
    );

    return appendImageVersion(transformedUrl, "1") ?? undefined;
  }, [isOtherLeadView]);
  const leadStatItems = [
    {
      key: "MM",
      count: initialData.counts.MM,
      label: dictionary.explore.mahaMantra,
      wrapperClassName: "min-w-0",
      rowClassName: "flex items-center gap-1.5",
      countClassName: `${displayHeadingClassName} -ml-1.5 -mt-1 pt-0.5 text-[1rem] leading-none text-[color:var(--theme-page-home-text)]`,
      icon: (
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden">
          <Image
            src="/nitai-gauranga-icon.svg"
            alt=""
            fill
            sizes="28px"
            className="object-contain"
          />
        </div>
      ),
    },
    {
      key: "BHJ",
      count: initialData.counts.BHJ,
      label: dictionary.explore.bhajans,
      wrapperClassName: "min-w-0",
      rowClassName: "flex items-center gap-1.5",
      countClassName: `${displayHeadingClassName} -ml-1.5 pt-0.5 text-[1rem] leading-none text-[color:var(--theme-page-home-text)]`,
      icon: (
        <Image
          src="/harmonium-transparent.png"
          width={24}
          height={24}
          alt=""
          className="h-7 w-7 shrink-0 object-contain"
        />
      ),
    },
    {
      key: "HK",
      count: initialData.counts.HK,
      label: dictionary.explore.hariKatha,
      wrapperClassName: "-ml-3 min-w-0",
      rowClassName: "flex items-center",
      countClassName: `${displayHeadingClassName} pt-0.5 text-[1rem] leading-none text-[color:var(--theme-page-home-text)]`,
      icon: (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(245,232,225,0.92)] text-[color:var(--theme-page-home-section-label)]">
          <SFIcon icon={sfBook} className="h-4 w-4" />
        </span>
      ),
    },
  ].filter((item) => item.count > 0);
  const usesExpandedLeadStats = leadStatItems.length >= 3;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f5d7d0_0%,_#f6e4de_18%,_#f7ece7_42%,_#f8f2ef_100%)] text-stone-900">
      <main className="relative z-10 mx-auto max-w-md px-5 py-6 space-y-8">
        <Suspense fallback={null}>
          <KirtanDeepLinkHandler
            kirtans={visible}
            onSelect={select}
            isActive={isActive}
            onPin={handleSharedKirtan}
          />
        </Suspense>
        <SubpageHeader
          title={undefined}
          backLabel={dictionary.explore.leadsBackLabel}
          backHref="/explore/leads"
          backgroundImageSrc={leadSingerHeaderImageSrc}
          backgroundImageFit="contain"
          overlayClassName="bg-[linear-gradient(180deg,rgba(255,248,243,0.02)_0%,rgba(255,248,243,0)_52%,rgba(246,228,222,0.22)_66%,rgba(246,228,222,0.58)_80%,rgba(246,228,222,0.82)_92%,rgba(246,228,222,0.94)_100%)]"
          bottomWashClassName="h-[34%] bg-[linear-gradient(180deg,rgba(246,228,222,0)_0%,rgba(246,228,222,0.32)_28%,rgba(246,228,222,0.76)_64%,rgba(246,228,222,1)_100%)]"
        />

        <section className="-mt-28 px-1 sm:-mt-34">
          <div className="relative z-10 flex items-start gap-4">
            <div className="-mt-6 h-36 w-28 shrink-0 overflow-hidden rounded-[1.8rem] border border-[rgba(221,189,169,0.92)] bg-[radial-gradient(circle_at_top,_rgba(255,251,247,0.98),rgba(244,230,221,0.90))] p-1 shadow-[0_18px_34px_rgba(120,53,15,0.12)] sm:-mt-3">
              <div className="relative h-full w-full overflow-hidden rounded-[1.3rem] bg-white/80">
                <LeadSingerAvatar
                  name={initialData.lead.display_name}
                  imageUrl={otherLeadHeroImageSrc ?? initialData.lead.image_url}
                  alt={initialData.lead.image_alt}
                  size="featured"
                  className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,251,247,0.96),rgba(244,230,221,0.86))]"
                  imageClassName="h-full w-full object-cover"
                  textClassName="absolute inset-0 flex items-center justify-center text-[1.4rem] font-semibold uppercase tracking-[0.02em] text-[#8e6254]"
                />
              </div>
            </div>

            <div className="-mt-3 relative z-20 min-w-0 flex-1 sm:-mt-1">
              <h1
                className={`${displayHeadingClassName} text-[1.6rem] leading-[0.95] text-[color:var(--theme-page-home-text)]`}
              >
                {initialData.lead.display_name}
              </h1>

              <div
                className={`mt-2 ${
                  usesExpandedLeadStats
                    ? "grid gap-2"
                    : "flex flex-wrap items-start justify-start gap-3"
                }`}
                style={
                  usesExpandedLeadStats
                    ? {
                        gridTemplateColumns: `repeat(${Math.max(leadStatItems.length, 1)}, minmax(0, 1fr))`,
                      }
                    : undefined
                }
              >
                {leadStatItems.map((item) => (
                  <div
                    key={item.key}
                    className={`${item.wrapperClassName} ${
                      usesExpandedLeadStats ? "" : "min-w-0"
                    }`}
                  >
                    <div className={item.rowClassName}>
                      {item.icon}
                      <span className={item.countClassName}>{item.count}</span>
                    </div>
                    <p className="mt-0 text-[0.62rem] leading-tight text-[color:var(--theme-page-home-muted)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              {initialData.lead.home_sanga_name ? (
                <div className="mt-1.5 -ml-2 flex items-center gap-0 text-[0.68rem] leading-none text-(--theme-page-home-muted)">
                  <img
                    src="/sanga-icon2-transparent.png"
                    width="22"
                    height="22"
                    alt=""
                    className="h-6 w-auto shrink-0 object-contain"
                  />
                  <span className="pt-px">
                    {initialData.lead.home_sanga_name}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="-mt-4">
          <SharedKirtanFeature
            kirtan={sharedKirtan}
            isActive={sharedKirtan ? isActive(sharedKirtan) : false}
            isPlaying={sharedKirtan ? isPlaying(sharedKirtan) : false}
            isLoading={sharedKirtan ? isAudioLoading(sharedKirtan) : false}
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
        </div>

        {featuredKirtan && !shouldHideFeatured ? (
          <div className={hasVisibleSharedCard ? "mt-4" : "-mt-6"}>
            <LeadFeaturedKirtanCard
              kirtan={featuredKirtan}
              titleOverride={
                isOtherLeadView
                  ? getLeadPageListTitle(featuredKirtan)
                  : undefined
              }
              subtitleOverride={
                isOtherLeadView
                  ? [featuredKirtan.lead_singer, featuredKirtan.recorded_date]
                      .filter(Boolean)
                      .join(" • ")
                  : undefined
              }
              isActive={isActive(featuredKirtan)}
              isPlaying={isPlaying(featuredKirtan)}
              isLoading={isAudioLoading(featuredKirtan)}
              onToggle={() => toggle(featuredKirtan)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(featuredKirtan.id)}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(featuredKirtan.id)}
            />
          </div>
        ) : null}

        {showTabs ? (
          <div className="mt-1 flex gap-2">
            {visibleFilters.map((filter) => {
              const active = activeType === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => {
                    setPinnedKirtan(null);
                    setActiveType(filter.key);
                  }}
                  className={`
                    rounded-full px-4 py-1.5 text-xs font-medium transition
                    ${
                      active
                        ? "bg-(--theme-player-green) text-white shadow-sm"
                        : "border border-[#efd4cb] bg-white text-[#7e665c] hover:bg-[#fff8f4]"
                    }
                  `}
                >
                  {filter.label} ({initialData.counts?.[filter.key] ?? 0})
                </button>
              );
            })}
          </div>
        ) : null}

        <section className="-mt-7">
          {isListLoading ? (
            <div className="mt-2 rounded-xl border border-dashed border-[#e5d7cf] bg-white/88 px-4 py-6">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`lead-kirtan-loading-${idx}`}
                    className="h-12 rounded-lg bg-[#f7efea] animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : renderedKirtans.length === 0 ? (
            <p className="mt-3 text-sm text-[#95786a]">
              {dictionary.explore.noKirtansFound}
            </p>
          ) : (
            <div className="mt-13 space-y-5">
              {groupedKirtans.map((group) => (
                <section key={group.key} className="space-y-2">
                  {group.label ? (
                    <div className="flex items-center gap-3 px-1">
                      <h3
                        className={`${displayHeadingClassName} text-[1.5rem] leading-none text-[color:var(--theme-page-home-section-label)]`}
                      >
                        {group.label}
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-[rgba(214,167,137,0.55)] to-transparent" />
                      <div className="flex items-center justify-end gap-3">
                        {visible.length > 1 ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => playCollection(visible)}
                              aria-label={dictionary.actions.playAll}
                              title={dictionary.actions.playAll}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5d7cf] bg-white text-[#9b7466] shadow-sm hover:bg-[#fff8f4]"
                            >
                              <SFIcon
                                icon={sfPlaySquareStackFill}
                                className="h-4 w-4"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                playCollection(visible, { shuffle: true })
                              }
                              aria-label={dictionary.actions.shuffle}
                              title={dictionary.actions.shuffle}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e7d8] bg-white text-[#6f9873] shadow-sm hover:bg-[#f5fbf5]"
                            >
                              <SFIcon
                                icon={sfShuffleCircle}
                                className="h-4 w-4"
                              />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <ul className="space-y-0">
                    {group.items.map((k) => (
                      <KirtanListItem
                        key={k.id}
                        kirtan={k}
                        leadingVisual={
                          isOtherLeadView ? (
                            <LeadSingerAvatar
                              name={k.lead_singer}
                              imageUrl={k.lead_singer_image_url}
                              alt={k.lead_singer_image_alt}
                              size="list"
                              className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,251,247,0.96),rgba(244,230,221,0.86))]"
                              imageClassName="h-full w-full object-cover"
                              textClassName="absolute inset-0 flex items-center justify-center text-[0.9rem] font-semibold uppercase tracking-[0.02em] text-[#8e6254]"
                            />
                          ) : undefined
                        }
                        titleOverride={
                          isOtherLeadView && activeType === "MM"
                            ? (k.lead_singer ?? getLeadPageListTitle(k))
                            : getLeadPageListTitle(k)
                        }
                        subtitleOverride={
                          isOtherLeadView
                            ? activeType === "MM"
                              ? getOtherLeadsMahaMantraSubtitle(k)
                              : (k.lead_singer ?? "")
                            : ""
                        }
                        useShortDate
                        truncateSangaAt={25}
                        stackActionsOnMobile
                        isActive={isActive(k)}
                        isPlaying={isPlaying(k)}
                        isLoading={isAudioLoading(k)}
                        onToggle={() => toggle(k)}
                        onEnqueue={enqueue}
                        onDequeue={dequeueById}
                        isQueued={isQueued(k.id)}
                        onToggleFavorite={toggleFavorite}
                        isFavorited={isFavorited(k.id)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {isLoadingMore ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#e5d7cf] bg-white/88 px-4 py-4 text-center text-sm text-[#95786a]">
              {dictionary.explore.loadingMore}
            </div>
          ) : null}
          <div ref={loadMoreRef} />
        </section>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 to-transparent" />
      </main>
    </div>
  );
}
