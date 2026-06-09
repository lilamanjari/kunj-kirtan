import type { ReactNode } from "react";
import Equalizer from "@/lib/components/Equalizer";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  formatKirtanDuration,
  getKirtanSequenceLabel,
  getListItemBorderTint,
} from "@/lib/kirtanPresentation";
import { formatDateLong, formatDateShort } from "@/lib/utils/date";
import { KirtanSummary } from "@/types/kirtan";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlayFill,
  sfSuitHeart,
  sfSuitHeartFill,
} from "@bradleyhodges/sfsymbols";
import {
  displayHeadingClassName,
  iconButtonInactiveClassName,
  durationPillClassName,
  favoriteActiveClassName,
  harmoniumPillClassName,
  playCircleButtonClassName,
  queueActiveClassName,
} from "@/lib/theme/componentThemes";
import { radiusClassNames } from "@/lib/theme/radii";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

type KirtanListItemProps = {
  kirtan: KirtanSummary;
  leadingVisual?: ReactNode;
  titleOverride?: string;
  subtitleOverride?: string;
  useShortDate?: boolean;
  truncateSangaAt?: number;
  stackActionsOnMobile?: boolean;
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

export default function KirtanListItem({
  kirtan,
  leadingVisual,
  titleOverride,
  subtitleOverride,
  useShortDate = false,
  truncateSangaAt,
  stackActionsOnMobile = false,
  isActive,
  isPlaying,
  isLoading,
  onToggle,
  onEnqueue,
  onDequeue,
  isQueued = false,
  onToggleFavorite,
  isFavorited = false,
}: KirtanListItemProps) {
  const dictionary = useDictionary();
  const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
  const sequenceLabel = getKirtanSequenceLabel(kirtan.sequence_num);
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const titleText = titleOverride ?? displayTitle;
  const subtitleText =
    subtitleOverride ??
    `${sequenceLabel ? `${sequenceLabel} by ` : ""}${kirtan.lead_singer ?? ""}`;
  const hasSubtitle = Boolean(subtitleText.trim());
  const borderTint = getListItemBorderTint(kirtan);
  const displaySanga =
    truncateSangaAt && kirtan.sanga && kirtan.sanga.length > truncateSangaAt
      ? `${kirtan.sanga.slice(0, truncateSangaAt).trimEnd()}...`
      : kirtan.sanga;
  const recordedDateLabel = kirtan.recorded_date
    ? useShortDate
      ? formatDateShort(
          kirtan.recorded_date,
          kirtan.recorded_date_precision,
        )
      : formatDateLong(
          kirtan.recorded_date,
          kirtan.recorded_date_precision,
        )
    : "";
  const metadataText =
    displaySanga && recordedDateLabel
      ? `${displaySanga} • ${recordedDateLabel}`
      : displaySanga || recordedDateLabel;
  const cardBackground = kirtan.is_rare_gem
    ? "bg-[rgba(255,250,241,0.96)]"
    : isActive
      ? "bg-[rgba(255,247,241,0.98)]"
      : "bg-[color:var(--theme-page-home-surface-strong)] hover:bg-[rgba(255,247,241,0.98)]";

  return (
    <li
      onClick={onToggle}
      className={`
        group relative z-0 flex cursor-pointer items-start gap-3 overflow-visible border px-4 py-1.5 shadow-[0_14px_30px_rgba(120,53,15,0.10)] transition ${radiusClassNames.card}
        ${cardBackground}
        ${
          kirtan.is_rare_gem
            ? "after:pointer-events-none after:absolute after:left-5 after:right-28 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[color:var(--theme-page-home-rare-gem-sheen)] after:to-transparent before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,_var(--theme-page-home-rare-gem-glow),_transparent_38%)] before:opacity-80 before:content-['']"
            : ""
        }
        ${isActive && isPlaying ? "animate-breathe" : ""}
        ${isActive && !isPlaying ? "opacity-90" : ""}
        ${isActive ? "z-20" : ""}
      `}
      style={{
        borderColor: borderTint,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-0 top-2 w-px rounded-full bg-[color:var(--theme-page-home-border)]"
      />
      {leadingVisual ? (
        <div className="relative z-[1] mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgba(255,252,249,0.95)] shadow-[inset_0_0_0_1px_rgba(210,183,160,0.28)]">
          {leadingVisual}
        </div>
      ) : null}
      <div className="relative z-[2] min-w-0 flex-1">
        <div className="flex items-start justify-between gap-0">
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-[1.05rem] leading-snug text-(--theme-page-home-text) ${displayHeadingClassName}`}
              title={titleText}
            >
              {titleText}
            </p>
          </div>
          {stackActionsOnMobile ? (
            <div className="ml-2 flex shrink-0 items-center gap-1 self-start sm:hidden">
              {kirtan.has_harmonium ? (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${harmoniumPillClassName}`}
                >
                  H
                </span>
              ) : null}
              {durationLabel ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${durationPillClassName}`}
                >
                  {durationLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {hasSubtitle ? (
          <div className="mt-0.5 flex items-center gap-1 leading-none">
            <p className="truncate text-xs text-(--theme-page-home-muted)">
              {subtitleText}
            </p>
          </div>
        ) : null}
        <div
          className={`text-xs leading-none text-(--theme-page-home-muted) ${
            stackActionsOnMobile
              ? `${hasSubtitle ? "mt-1" : "mt-0.5"} grid grid-cols-[1fr_auto] items-end gap-x-2 gap-y-1 sm:${hasSubtitle ? "-mt-3" : "-mt-2"} sm:flex sm:items-end sm:justify-between`
              : `${hasSubtitle ? "-mt-3" : "-mt-2"} flex items-end justify-between gap-0`
          }`}
        >
          <div className="min-w-0 flex-1 self-center sm:self-auto">
            <span className="truncate">{metadataText}</span>
          </div>
          <div
            className={`relative z-[3] flex shrink-0 items-center gap-1 ${
              stackActionsOnMobile ? "col-start-2 row-start-1 self-end sm:self-auto" : ""
            }`}
          >
            {!stackActionsOnMobile && kirtan.has_harmonium ? (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${harmoniumPillClassName}`}
              >
                H
              </span>
            ) : null}
            {!stackActionsOnMobile && durationLabel ? (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${durationPillClassName}`}
              >
                {durationLabel}
              </span>
            ) : null}
            {onToggleFavorite ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(kirtan);
                }}
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
            {onEnqueue || onDequeue ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (isQueued && onDequeue) {
                    onDequeue(kirtan.id);
                    return;
                  }
                  if (!onEnqueue) return;
                  onEnqueue(kirtan);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
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
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
              className={`h-7 w-7 shrink-0 ${playCircleButtonClassName}`}
              aria-label={dictionary.actions.playOrPause}
              title={dictionary.actions.playOrPause}
            >
              {isActive && isLoading ? (
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
              ) : isActive && isPlaying ? (
                <Equalizer className="ml-0 h-3 gap-px" />
              ) : (
                <SFIcon icon={sfPlayFill} className="h-3 w-3 transition" />
              )}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
