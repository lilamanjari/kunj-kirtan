import type { ReactNode } from "react";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import Equalizer from "@/lib/components/Equalizer";
import OfflineDownloadBadge from "@/lib/components/OfflineDownloadBadge";
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
  showOfflineToggle?: boolean;
  onToggleOffline?: (kirtan: KirtanSummary) => void | Promise<void>;
};

export default function KirtanListItem({
  kirtan,
  leadingVisual,
  titleOverride,
  subtitleOverride,
  useShortDate = false,
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
  showOfflineToggle = false,
  onToggleOffline,
}: KirtanListItemProps) {
  const dictionary = useDictionary();
  const audioPlayer = useAudioPlayer();
  const isOfflineAvailable =
    audioPlayer.isOfflineAvailable ?? (() => false);
  const isOfflineDownloading =
    audioPlayer.isOfflineDownloading ?? (() => false);
  const isOfflineSelected =
    audioPlayer.isOfflineSelected ?? (() => false);
  const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
  const sequenceLabel = getKirtanSequenceLabel(kirtan.sequence_num);
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const titleText = titleOverride ?? displayTitle;
  const subtitleText =
    subtitleOverride ??
    `${sequenceLabel ? `${sequenceLabel} by ` : ""}${kirtan.lead_singer ?? ""}`;
  const hasSubtitle = Boolean(subtitleText.trim());
  const borderTint = getListItemBorderTint(kirtan);
  const displaySanga = kirtan.sanga ?? "";
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
  const hasSanga = Boolean(displaySanga);
  const hasRecordedDate = Boolean(recordedDateLabel);
  const cardBackground = kirtan.is_rare_gem
    ? "bg-[rgba(255,250,241,0.96)]"
    : isActive
      ? "bg-[rgba(255,247,241,0.98)]"
      : "bg-[color:var(--theme-page-home-surface-strong)] hover:bg-[rgba(255,247,241,0.98)]";
  const showCompactMobileMeta = stackActionsOnMobile;
  const offlineAvailable = isOfflineAvailable(kirtan.id);
  const offlineDownloading = isOfflineDownloading(kirtan.id);
  const offlineSelected = isOfflineSelected(kirtan.id);
  const showOfflineButton = showOfflineToggle && onToggleOffline;
  const showPassiveOfflineBadge = !showOfflineButton;

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
          {showCompactMobileMeta ? (
            <div className="ml-2 flex shrink-0 items-center gap-1 self-start">
              {kirtan.has_harmonium ? (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${harmoniumPillClassName}`}
                >
                  H
                </span>
              ) : null}
              {showPassiveOfflineBadge ? (
                <OfflineDownloadBadge
                  downloaded={offlineAvailable}
                  downloading={offlineDownloading}
                  className="shrink-0"
                />
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
            showCompactMobileMeta
              ? `${hasSubtitle ? "mt-1" : "mt-0.5"} grid grid-cols-[1fr_auto] items-end gap-x-2 gap-y-1 sm:${hasSubtitle ? "-mt-3" : "-mt-2"} sm:flex sm:items-end sm:justify-between`
              : `${hasSubtitle ? "-mt-3" : "-mt-2"} flex items-end justify-between gap-0`
          }`}
        >
          <div className="min-w-0 flex flex-1 items-center self-center sm:self-auto">
            {hasSanga ? (
              <span className="min-w-0 truncate" title={displaySanga}>
                {displaySanga}
              </span>
            ) : null}
            {hasSanga && hasRecordedDate ? (
              <span className="shrink-0 px-1.5">•</span>
            ) : null}
            {hasRecordedDate ? (
              <span className="shrink-0">{recordedDateLabel}</span>
            ) : null}
          </div>
          <div
            className={`relative z-[3] flex shrink-0 items-center gap-1 ${
              showCompactMobileMeta ? "col-start-2 row-start-1 self-end sm:self-auto" : ""
            }`}
          >
            {!showCompactMobileMeta && kirtan.has_harmonium ? (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${harmoniumPillClassName}`}
              >
                H
              </span>
            ) : null}
            {!showCompactMobileMeta && showPassiveOfflineBadge ? (
              <OfflineDownloadBadge
                downloaded={offlineAvailable}
                downloading={offlineDownloading}
                className="shrink-0"
              />
            ) : null}
            {!showCompactMobileMeta && durationLabel ? (
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
            {showOfflineButton ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onToggleOffline(kirtan);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                  offlineAvailable
                    ? "border-[#6f9752]/45 bg-[#eff5ea] text-[#5f8644] hover:bg-[#e5efdd]"
                    : offlineDownloading
                      ? "border-[#8db171]/45 bg-[#f7fbf3] text-[#6f9752]"
                      : offlineSelected
                        ? "border-[#c8d9bb] bg-white text-[#8daa73] hover:bg-[#f7fbf3]"
                        : "border-[#ead8d2] bg-white text-stone-400 hover:bg-[#fff7f3]"
                }`}
                aria-label={
                  offlineSelected
                    ? dictionary.actions.removeFromOffline
                    : dictionary.actions.addToOffline
                }
                title={
                  offlineSelected
                    ? dictionary.actions.removeFromOffline
                    : dictionary.actions.addToOffline
                }
              >
                {offlineDownloading ? (
                  <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#b7c9a7] border-t-[#6f9752]" />
                ) : offlineAvailable ? (
                  <span className="text-[12px] font-bold leading-none">↓</span>
                ) : (
                  <span className="text-[12px] font-bold leading-none">↓</span>
                )}
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
