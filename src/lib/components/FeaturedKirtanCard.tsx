import type { ReactNode } from "react";
import Equalizer from "@/lib/components/Equalizer";
import LeadSingerAvatar from "@/lib/components/LeadSingerAvatar";
import { buildBucketImageUrl, buildTransformedImageUrl } from "@/lib/media";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  formatKirtanDuration,
  getKirtanSequenceLabel,
} from "@/lib/kirtanPresentation";
import { formatDateShort } from "@/lib/utils/date";
import { KirtanSummary } from "@/types/kirtan";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlayFill,
  sfSuitHeart,
  sfSuitHeartFill,
  sfXmark,
} from "@bradleyhodges/sfsymbols";
import {
  displayHeadingClassName,
  iconButtonInactiveClassName,
  durationPillClassName,
  favoriteActiveClassName,
  harmoniumPillClassName,
  homeSurfaceCardActiveClassName,
  playCircleButtonClassName,
  queueActiveClassName,
} from "@/lib/theme/componentThemes";
import type { FeaturedCardPalette } from "@/lib/theme/pagePalettes";
import { radiusClassNames } from "@/lib/theme/radii";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

type FeaturedKirtanCardProps = {
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
  palette?: FeaturedCardPalette;
  contextLine?: string;
  label?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  artwork?: ReactNode;
  titleOverride?: string;
  subtitleOverride?: string;
};

export default function FeaturedKirtanCard({
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
  palette,
  contextLine,
  label,
  onDismiss,
  dismissLabel,
  artwork,
  titleOverride,
  subtitleOverride,
}: FeaturedKirtanCardProps) {
  const dictionary = useDictionary();
  const sequenceLabel = getKirtanSequenceLabel(kirtan.sequence_num);
  const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const titleText = titleOverride ?? displayTitle;
  const subtitleText =
    subtitleOverride ??
    `${sequenceLabel ? `${sequenceLabel} by ` : ""}${kirtan.lead_singer ?? ""}`;
  const defaultArtwork =
    !artwork && (kirtan.lead_singer_image_url || kirtan.lead_singer) ? (
      <LeadSingerAvatar
        name={kirtan.lead_singer}
        imageUrl={kirtan.lead_singer_image_url}
        alt={kirtan.lead_singer_image_alt}
        size="featured"
        className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,251,247,0.96),rgba(244,230,221,0.86))]"
        imageClassName="h-full w-full object-cover opacity-90"
        textClassName="absolute inset-0 flex items-center justify-center text-[1.55rem] font-semibold uppercase tracking-[0.02em] text-[#8e6254]"
      />
    ) : null;
  const cardToneClass =
    palette?.cardClassName ??
    "border border-[color:var(--theme-page-home-border)] bg-[color:var(--theme-page-home-surface)] text-[color:var(--theme-page-home-text)] shadow-[0_18px_34px_var(--theme-page-home-shadow)]";
  const cardToneStyle = palette?.cardStyle;
  const backgroundArtworkSrc = buildTransformedImageUrl(
    buildBucketImageUrl("page-art/vrindavan-background.png"),
    {
      width: 1200,
      height: 720,
      fit: "cover",
      format: "png",
      quality: 82,
    },
  );

  return (
    <section
      className={`
        relative overflow-hidden px-5 py-4 transition ${radiusClassNames.surface}
        ${cardToneClass}
        ${isActive ? `${homeSurfaceCardActiveClassName} ${palette?.playbackRingColor ?? "ring-[#d58a96]/50"}` : ""}
        ${isPlaying ? "animate-breathe" : ""}
      `}
      style={cardToneStyle}
    >
      {backgroundArtworkSrc ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={backgroundArtworkSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-[78%_center] opacity-90"
          />
        </div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(246,240,234,0.94) 0%, rgba(246,240,234,0.98) 18%, rgba(246,240,234,0.88) 32%, rgba(246,240,234,0.68) 46%, rgba(246,240,234,0.84) 58%, rgba(246,240,234,0.52) 72%, rgba(246,240,234,0.18) 88%, rgba(246,240,234,0.06) 100%)",
        }}
      />

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-current/10 bg-white/70 text-current/65 transition hover:bg-white hover:text-current"
          aria-label={dismissLabel}
          title={dismissLabel}
        >
          <SFIcon icon={sfXmark} className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div className={`relative z-10 ${onDismiss ? "pr-12" : ""}`}>
        <p
          className={`text-xs font-medium uppercase tracking-[0.16em] ${
            palette?.featuredLabelColor ?? "text-white/58"
          }`}
        >
          {label ?? dictionary.common.featured}
        </p>
      </div>
      {contextLine ? (
        <p
          className={`relative z-10 mt-1 text-sm font-medium ${
            palette?.contextLineColor ?? "text-[#e4b6a7]"
          }`}
        >
          {contextLine}
        </p>
      ) : null}

      <div className="relative z-10 mt-3">
        <div className="flex items-start gap-4 sm:gap-5">
          {artwork || defaultArtwork ? (
            <div
              className={`flex h-[8.5rem] w-[7.25rem] shrink-0 items-end justify-center overflow-hidden bg-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] sm:h-[11.5rem] sm:w-[8.8rem] ${radiusClassNames.card}`}
            >
              {artwork ?? defaultArtwork}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 pt-2 sm:pt-4">
            <h1
              className={`${displayHeadingClassName} max-w-[13ch] pr-1 text-[1.35rem] leading-[0.98] sm:max-w-[11ch] sm:pr-4 sm:text-[2.1rem]`}
            >
              {titleText}
            </h1>

            <div className="mt-1">
              <p
                className={`text-[1rem] font-medium leading-snug sm:text-[1.15rem] ${palette?.leadsingerLabelColor ?? "text-stone-300"}`}
                style={{ textShadow: "0 1px 12px rgba(255, 248, 244, 0.78)" }}
              >
                {subtitleText}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 sm:hidden">
          <div
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] ${
              palette?.metadataLabelColor ?? "text-stone-400"
            }`}
          >
            {kirtan.recorded_date ? (
              <span>
                {formatDateShort(
                  kirtan.recorded_date,
                  kirtan.recorded_date_precision,
                )}
              </span>
            ) : null}
            {kirtan.has_harmonium ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  harmoniumPillClassName
                }`}
              >
                H
              </span>
            ) : null}
            {durationLabel ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  durationPillClassName
                }`}
              >
                {durationLabel}
              </span>
            ) : null}
          </div>

          {onToggleFavorite || onEnqueue ? (
            <div className="ml-auto flex shrink-0 items-end gap-1">
              {onToggleFavorite ? (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(kirtan)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
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
                    className="h-3.5 w-3.5"
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
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                    isQueued
                      ? queueActiveClassName
                      : iconButtonInactiveClassName
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
              <button
                disabled={isLoading && !isActive}
                onClick={onToggle}
                className={`h-11 w-11 shrink-0 ${playCircleButtonClassName} disabled:pointer-events-none disabled:opacity-40`}
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
            </div>
          ) : null}
        </div>

        <div className="mt-5 hidden items-end justify-between gap-2 sm:flex">
          <div
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] ${
              palette?.metadataLabelColor ?? "text-stone-400"
            }`}
          >
            {kirtan.recorded_date ? (
              <span>
                {formatDateShort(
                  kirtan.recorded_date,
                  kirtan.recorded_date_precision,
                )}
              </span>
            ) : null}
            {kirtan.has_harmonium ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  harmoniumPillClassName
                }`}
              >
                H
              </span>
            ) : null}
            {durationLabel ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  durationPillClassName
                }`}
              >
                {durationLabel}
              </span>
            ) : null}
          </div>

          {isActive && isPlaying ? (
            <span className="ml-auto inline-flex h-7 shrink-0 items-center justify-center">
              <Equalizer className="h-3.5 gap-px" />
            </span>
          ) : null}
          {onToggleFavorite || onEnqueue ? (
            <div className="ml-auto flex shrink-0 items-end gap-1">
              {onToggleFavorite ? (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(kirtan)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
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
                    className="h-3.5 w-3.5"
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
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                    isQueued
                      ? queueActiveClassName
                      : iconButtonInactiveClassName
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
              <button
                disabled={isLoading && !isActive}
                onClick={onToggle}
                className={`h-11 w-11 shrink-0 ${playCircleButtonClassName} disabled:pointer-events-none disabled:opacity-40`}
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
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
