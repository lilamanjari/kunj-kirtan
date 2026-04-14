import Equalizer from "@/lib/components/Equalizer";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { formatDateLong } from "@/lib/utils/date";
import { KirtanSummary } from "@/types/kirtan";

type KirtanListItemProps = {
  kirtan: KirtanSummary;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onEnqueue?: (kirtan: KirtanSummary) => void;
  onDequeue?: (id: string) => void;
  isQueued?: boolean;
};

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "";
  }

  const total = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0",
    )}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function hashHue(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return hash;
}

export default function KirtanListItem({
  kirtan,
  isActive,
  isPlaying,
  isLoading,
  onToggle,
  onEnqueue,
  onDequeue,
  isQueued = false,
}: KirtanListItemProps) {
  const durationLabel = formatDuration(kirtan.duration_seconds);
  const sequenceLabel = kirtan.sequence_num ? `#${kirtan.sequence_num}` : null;
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const baseHue = hashHue(kirtan.id);
  const tintHue = kirtan.type === "BHJ" ? (baseHue + 340) % 360 : baseHue;
  const borderTint = kirtan.is_rare_gem
    ? "rgba(251, 191, 36, 0.65)"
    : `hsla(${tintHue}, 70%, 85%, 1)`;
  const cardBackground = kirtan.is_rare_gem
    ? "bg-[linear-gradient(180deg,rgba(255,251,245,1)_0%,rgba(255,255,255,1)_36%,rgba(255,249,244,1)_100%)]"
    : isActive
      ? "bg-gradient-to-r from-[#fff7f3] via-[#fff3ee] to-[#f9e5df]"
      : "bg-white hover:bg-[#fff7f3]";

  return (
    <li
      onClick={onToggle}
      className={`
        relative flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 shadow-[0_14px_30px_rgba(120,53,15,0.10)] transition
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
        borderColor: borderTint || "rgba(226,232,240,0.7)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {displayTitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {kirtan.has_harmonium ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                H
              </span>
            ) : null}
            {durationLabel ? (
              <span className="shrink-0 rounded-full bg-[#e8f6ef] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2e8c6f]">
                {durationLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
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
        <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
          {kirtan.recorded_date ? (
            <span className="truncate">
              {formatDateLong(
                kirtan.recorded_date,
                kirtan.recorded_date_precision,
              )}
            </span>
          ) : null}
        </div>
      </div>

      <div className="ml-4 flex items-center gap-2">
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
        <div className="flex h-6 w-6 items-center justify-center">
          {isActive && isLoading ? (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          ) : isActive && isPlaying ? (
            <Equalizer />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition ${
                isActive ? "text-[#c56a72]" : "text-stone-600"
              }`}
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          )}
        </div>
      </div>
    </li>
  );
}
