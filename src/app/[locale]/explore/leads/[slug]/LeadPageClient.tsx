"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
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
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import SubpageHeader from "@/lib/components/SubpageHeader";
import { leadsPalette } from "@/lib/theme/pagePalettes";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import { getKirtanCardText } from "@/lib/kirtanCardPresentation";

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
  const visible = activeType ? (listsByType[activeType]?.kirtans ?? []) : [];
  const isListLoading = Boolean(activeType && !listsByType[activeType]);
  const featuredKirtan = initialData.featured ?? null;
  const renderedKirtans = pinnedKirtan
    ? [pinnedKirtan, ...visible.filter((k) => k.id !== pinnedKirtan.id)]
    : visible;
  const [sharedKirtan, setSharedKirtan] = useState<KirtanSummary | null>(null);
  const [sharedCardDismissed, setSharedCardDismissed] = useState(false);
  const hasVisibleSharedCard = !!sharedKirtan && !sharedCardDismissed;
  const shouldHideFeatured =
    hasVisibleSharedCard && sharedKirtan.id === featuredKirtan?.id;

  function handleSharedKirtan(kirtan: KirtanSummary) {
    setPinnedKirtan(kirtan);
    setSharedKirtan(kirtan);
    setSharedCardDismissed(false);
  }

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
          title={initialData.lead.display_name}
          backLabel={dictionary.explore.leadsBackLabel}
          backHref="/explore/leads"
        />

        <div className="-mt-6">
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
            <FeaturedKirtanCard
              kirtan={featuredKirtan}
              isActive={isActive(featuredKirtan)}
              isPlaying={isPlaying(featuredKirtan)}
              isLoading={isAudioLoading(featuredKirtan)}
              onToggle={() => toggle(featuredKirtan)}
              onEnqueue={enqueue}
              onDequeue={dequeueById}
              isQueued={isQueued(featuredKirtan.id)}
              onToggleFavorite={toggleFavorite}
              isFavorited={isFavorited(featuredKirtan.id)}
              palette={leadsPalette.featuredCard}
              titleOverride={getKirtanCardText(featuredKirtan).title}
              subtitleOverride={getKirtanCardText(featuredKirtan).subtitle}
              artwork={
                <LeadSingerAvatar
                  name={featuredKirtan.lead_singer}
                  imageUrl={featuredKirtan.lead_singer_image_url}
                  alt={featuredKirtan.lead_singer_image_alt}
                  size="featured"
                  className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,251,247,0.96),rgba(244,230,221,0.86))]"
                  imageClassName="h-full w-full object-cover"
                  textClassName="absolute inset-0 flex items-center justify-center text-[1.55rem] font-semibold uppercase tracking-[0.02em] text-[#8e6254]"
                />
              }
            />
          </div>
        ) : null}

        {showTabs ? (
          <div className="flex gap-2">
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
                        ? "bg-gradient-to-r from-[#d49897] to-[#79a14f] text-white shadow-sm"
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

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-wide text-stone-500">
              {dictionary.explore.kirtans}
            </h2>
            {visible.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playCollection(visible)}
                  aria-label={dictionary.actions.playAll}
                  title={dictionary.actions.playAll}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5d7cf] bg-white text-[#9b7466] shadow-sm hover:bg-[#fff8f4]"
                >
                  <SFIcon icon={sfPlaySquareStackFill} className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => playCollection(visible, { shuffle: true })}
                  aria-label={dictionary.actions.shuffle}
                  title={dictionary.actions.shuffle}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e7d8] bg-white text-[#6f9873] shadow-sm hover:bg-[#f5fbf5]"
                >
                  <SFIcon icon={sfShuffleCircle} className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          {isListLoading ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#e5d7cf] bg-white/88 px-4 py-6">
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
            <p className="mt-4 text-sm text-[#95786a]">
              {dictionary.explore.noKirtansFound}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {renderedKirtans.map((k) => (
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
