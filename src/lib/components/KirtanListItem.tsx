import Equalizer from "@/lib/components/Equalizer";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import {
  formatKirtanDuration,
  getKirtanSequenceLabel,
  getListItemBorderTint,
} from "@/lib/kirtanPresentation";
import { formatDateLong } from "@/lib/utils/date";
import { KirtanSummary } from "@/types/kirtan";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlayFill,
  sfSuitHeart,
  sfSuitHeartFill,
} from "@bradleyhodges/sfsymbols";

type KirtanListItemProps = {
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

export default function KirtanListItem({
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
}: KirtanListItemProps) {
  const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
  const sequenceLabel = getKirtanSequenceLabel(kirtan.sequence_num);
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const borderTint = getListItemBorderTint(kirtan);
  const cardBackground = kirtan.is_rare_gem
    ? "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)]"
    : isActive
      ? "bg-gradient-to-r from-[#fff7f3] via-[#fff3ee] to-[#f9e5df]"
      : "bg-white hover:bg-[#fff7f3]";

  return (
    <li
      onClick={onToggle}
      className={`
        group relative flex cursor-pointer items-start justify-between rounded-xl border px-4 py-2.5 shadow-[0_14px_30px_rgba(120,53,15,0.10)] transition
        ${cardBackground}
        ${
          kirtan.is_rare_gem
            ? "after:absolute after:left-5 after:right-28 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-amber-200/90 after:to-transparent"
            : ""
        }
        ${isActive && isPlaying ? "animate-breathe" : ""}
        ${isActive && !isPlaying ? "opacity-90" : ""}
      `}
      style={{
        borderColor: borderTint,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-medium"
              title={displayTitle}
            >
              {displayTitle}
            </p>
          </div>
          {kirtan.has_harmonium ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              H
            </span>
          ) : null}
        </div>
        <div className="mt-px flex items-center gap-1">
          {sequenceLabel ? (
            <span className="shrink-0 text-xs font-normal text-stone-500">
              {sequenceLabel} by
            </span>
          ) : null}
          <p className="truncate text-xs text-stone-500">
            {kirtan.lead_singer}
            {kirtan.sanga ? ` • ${kirtan.sanga}` : ""}
          </p>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-3 text-xs text-stone-500">
          <div className="min-w-0 flex-1">
            {kirtan.recorded_date ? (
              <span className="truncate">
                {formatDateLong(
                  kirtan.recorded_date,
                  kirtan.recorded_date_precision,
                )}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {durationLabel ? (
              <span className="shrink-0 rounded-full bg-[#e8f6ef] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2e8c6f]">
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
                    ? "cursor-pointer border-[#f3c2ce] bg-[#fff1f5] text-[#c45d74]"
                    : "cursor-pointer border-[#efd4cb] bg-white text-[#cc7680] hover:bg-[#fff7f3]"
                }`}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
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
                  isQueued
                    ? "cursor-pointer border-[#d2eadf] bg-[#eef8f3] text-[#2e8c6f]"
                    : "cursor-pointer border-[#efd4cb] bg-white text-[#cc7680] hover:bg-[#fff7f3]"
                }`}
                aria-label={isQueued ? "Remove from queue" : "Add to queue"}
                title={isQueued ? "Remove from queue" : "Add to queue"}
              >
                {isQueued ? "✓" : "+"}
              </button>
            ) : null}
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/92 text-[#a87166] shadow-[0_4px_10px_rgba(120,53,15,0.10)] transition group-hover:translate-x-0.5">
              {isActive && isLoading ? (
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
              ) : isActive && isPlaying ? (
                <Equalizer className="ml-0 h-3 gap-px" />
              ) : (
                <SFIcon
                  icon={sfPlayFill}
                  className={`h-3 w-3 transition ${
                    isActive ? "text-[#c56a72]" : "text-[#a87166]"
                  }`}
                />
              )}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
