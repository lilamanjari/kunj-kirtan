"use client";

import Equalizer from "@/lib/components/Equalizer";
import { useDictionary, useLocale } from "@/lib/i18n/LocaleProvider";
import { buildBucketImageUrl, buildTransformedImageUrl } from "@/lib/media";
import {
  featuredPlayButtonClassName,
  favoriteActiveClassName,
  iconButtonInactiveClassName,
  queueActiveClassName,
  displayHeadingClassName,
} from "@/lib/theme/componentThemes";
import { radiusClassNames } from "@/lib/theme/radii";
import { formatKirtanDuration, getKirtanSequenceLabel } from "@/lib/kirtanPresentation";
import { formatDateShort } from "@/lib/utils/date";
import type { KirtanSummary } from "@/types/kirtan";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlayFill,
  sfSuitHeart,
  sfSuitHeartFill,
} from "@bradleyhodges/sfsymbols";

type LeadFeaturedKirtanCardProps = {
  kirtan: KirtanSummary;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onEnqueue?: (kirtan: KirtanSummary) => void;
  onDequeue?: (id: string) => void;
  isQueued?: boolean;
  onToggleFavorite?: (kirtan: KirtanSummary) => void;
  isFavorited?: boolean;
};

export default function LeadFeaturedKirtanCard({
  kirtan,
  isActive,
  isPlaying,
  isLoading,
  onToggle,
  onEnqueue,
  onDequeue,
  isQueued = false,
  onToggleFavorite,
  isFavorited = false,
}: LeadFeaturedKirtanCardProps) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const titleText = `${kirtan.title}${getKirtanSequenceLabel(kirtan.sequence_num) ? ` ${getKirtanSequenceLabel(kirtan.sequence_num)}` : ""}`;
  const dateLabel = formatDateShort(
    kirtan.recorded_date,
    kirtan.recorded_date_precision,
    locale,
  );
  const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
  const subtitleText = [dateLabel, durationLabel].filter(Boolean).join(" • ");
  const artworkSrc = buildTransformedImageUrl(
    buildBucketImageUrl("page-art/leadsinger-featured.png"),
    {
      width: 720,
      height: 360,
      fit: "cover",
      format: "png",
      quality: 82,
    },
  );

  return (
    <section
      className={`relative overflow-hidden border border-[#fdf3da] bg-[rgba(255,249,244,0.92)] px-5 py-4 text-[#5c463e] shadow-[0_20px_42px_rgba(196,157,58,0.26)] backdrop-blur-sm ${radiusClassNames.surface}`}
    >
      {artworkSrc ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={`${artworkSrc}&v=1`}
            alt=""
            className="h-full w-full object-cover object-[76%_center]"
          />
        </div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(118deg, rgba(255,249,244,0.99) 0%, rgba(255,251,247,0.97) 34%, rgba(255,251,247,0.58) 50%, rgba(255,251,247,0.22) 64%, rgba(255,251,247,0.04) 80%, rgba(255,251,247,0) 90%)",
        }}
      />

      <div className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9e7b69]">
          {dictionary.common.featured}
        </p>

        <div className="mt-3 min-h-[7rem] max-w-[64%]">
          <h2
            className={`${displayHeadingClassName} text-[1.55rem] leading-[0.98] text-[#5c463e]`}
          >
            {titleText}
          </h2>
          {subtitleText ? (
            <p className="mt-1.5 text-[0.92rem] leading-snug text-[#96786a]">
              {subtitleText}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading && !isActive}
              onClick={onToggle}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${featuredPlayButtonClassName} disabled:pointer-events-none disabled:opacity-40`}
              aria-label={dictionary.actions.playOrPause}
              title={dictionary.actions.playOrPause}
            >
              {isActive && isLoading ? (
                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
              ) : isActive && isPlaying ? (
                <Equalizer className="h-4 gap-px" />
              ) : (
                <SFIcon icon={sfPlayFill} className="ml-0.5 h-5 w-5" />
              )}
            </button>

            {onToggleFavorite ? (
              <button
                type="button"
                onClick={() => onToggleFavorite(kirtan)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  isFavorited
                    ? favoriteActiveClassName
                    : iconButtonInactiveClassName
                }`}
                aria-label={
                  isFavorited
                    ? dictionary.actions.removeFromFavorites
                    : dictionary.actions.addToFavorites
                }
                title={
                  isFavorited
                    ? dictionary.actions.removeFromFavorites
                    : dictionary.actions.addToFavorites
                }
              >
                <SFIcon
                  icon={isFavorited ? sfSuitHeartFill : sfSuitHeart}
                  className="h-4 w-4"
                />
              </button>
            ) : null}

            {onEnqueue ? (
              <button
                type="button"
                onClick={() => {
                  if (isQueued && onDequeue) {
                    onDequeue(kirtan.id);
                    return;
                  }
                  onEnqueue(kirtan);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                  isQueued ? queueActiveClassName : iconButtonInactiveClassName
                }`}
                aria-label={
                  isQueued
                    ? dictionary.actions.removeFromQueue
                    : dictionary.actions.addToQueue
                }
                title={
                  isQueued
                    ? dictionary.actions.removeFromQueue
                    : dictionary.actions.addToQueue
                }
              >
                {isQueued ? "✓" : "+"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
