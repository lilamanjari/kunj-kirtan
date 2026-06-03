import Equalizer from "@/lib/components/Equalizer";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  formatKirtanDuration,
  getKirtanSequenceLabel,
} from "@/lib/kirtanPresentation";
import { formatDateShort } from "@/lib/utils/date";
import { KirtanSummary } from "@/types/kirtan";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPauseFill,
  sfPlayFill,
  sfSuitHeart,
  sfSuitHeartFill,
  sfXmark,
} from "@bradleyhodges/sfsymbols";
import {
  iconButtonInactiveClassName,
  durationPillClassName,
  favoriteActiveClassName,
  featuredPlayButtonClassName,
  harmoniumPillClassName,
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
}: FeaturedKirtanCardProps) {
  const dictionary = useDictionary();
  const sequenceLabel = getKirtanSequenceLabel(kirtan.sequence_num);
  const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const cardToneClass =
    palette?.cardClassName ??
    "bg-gradient-to-br from-[#241a18] via-[#2f201d] to-[#5d1b33] text-white shadow-[0_18px_36px_rgba(120,53,15,0.18)]";
  const cardToneStyle = palette?.cardStyle;

  return (
    <section
      className={`
        relative overflow-hidden p-6 transition ${radiusClassNames.surface}
        ${cardToneClass}
        ${isActive ? `ring-2 ${palette?.playbackRingColor ?? "ring-[#d58a96]/50"}` : ""}
        ${isPlaying ? "animate-breathe" : ""}
      `}
      style={cardToneStyle}
    >
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-current/15 bg-white/45 text-current/65 transition hover:bg-white/65 hover:text-current"
          aria-label={dismissLabel}
          title={dismissLabel}
        >
          <SFIcon icon={sfXmark} className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div className={onDismiss ? "pr-12" : undefined}>
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
          className={`mt-1 text-sm font-medium ${
            palette?.contextLineColor ?? "text-[#e4b6a7]"
          }`}
        >
          {contextLine}
        </p>
      ) : null}

      <h1
        className={`${contextLine ? "mt-2" : "mt-2"} pr-10 text-3xl font-semibold leading-[1.08]`}
      >
        {displayTitle}
      </h1>

      {/* Lead singer row */}
      <div className="mt-1.5">
        <p className={palette?.leadsingerLabelColor ?? "text-stone-300"}>
          {sequenceLabel ? `${sequenceLabel} by` : ""}
          {sequenceLabel ? " " : ""}
          {kirtan.lead_singer}
        </p>
      </div>

      <div
        className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${
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
        {isActive && isPlaying ? (
          <span className="ml-auto inline-flex h-7 items-center justify-center">
            <Equalizer className="h-3.5 gap-px" />
          </span>
        ) : null}
        {onToggleFavorite || onEnqueue ? (
          <div
            className={`flex items-center gap-2 ${
              isActive && isPlaying ? "" : "ml-auto"
            }`}
          >
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
          </div>
        ) : null}
      </div>

      {/* Action button */}
      <button
        disabled={isLoading && !isActive}
        onClick={onToggle}
        className={`
          mt-6 w-full py-3 font-medium transition ${radiusClassNames.card}
          ${featuredPlayButtonClassName}
          disabled:opacity-40 disabled:pointer-events-none
        `}
      >
        <span
          className={`inline-block transition-transform duration-200 ${
            isActive && isPlaying ? "scale-110" : "scale-100"
          }`}
        >
          {isActive && isPlaying ? (
            <SFIcon icon={sfPauseFill} className="w-5 h-5" />
          ) : (
            <SFIcon icon={sfPlayFill} className="w-5 h-5 ml-1" />
          )}
        </span>
      </button>
    </section>
  );
}
