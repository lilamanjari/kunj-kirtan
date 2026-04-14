import Equalizer from "@/lib/components/Equalizer";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { formatDateShort } from "@/lib/utils/date";
import { KirtanSummary } from "@/types/kirtan";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import { sfPauseFill, sfPlayFill } from "@bradleyhodges/sfsymbols";

type FeaturedKirtanCardProps = {
  kirtan: KirtanSummary;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onEnqueue?: (kirtan: KirtanSummary) => void;
  onDequeue?: (id: string) => void;
  isQueued?: boolean;
  tone?: "default" | "home";
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

export default function FeaturedKirtanCard({
  kirtan,
  isActive,
  isPlaying,
  isLoading,
  onToggle,
  onEnqueue,
  onDequeue,
  isQueued = false,
  tone = "default",
}: FeaturedKirtanCardProps) {
  const sequenceLabel = kirtan.sequence_num ? `#${kirtan.sequence_num}` : null;
  const durationLabel = formatDuration(kirtan.duration_seconds);
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const cardToneClass =
    tone === "home"
      ? "text-white shadow-[0_18px_36px_rgba(120,53,15,0.18)]"
      : "bg-gradient-to-br from-[#241a18] via-[#2f201d] to-[#5d1b33] text-white shadow-[0_18px_36px_rgba(120,53,15,0.18)]";
  const cardToneStyle =
    tone === "home"
      ? {
          backgroundColor: "#2a1d1b",
          backgroundImage:
            "linear-gradient(135deg, #2a1d1b 0%, #341f1b 56%, #681730 100%)",
        }
      : undefined;

  return (
    <section
      className={`
        relative rounded-2xl p-6 transition
        ${cardToneClass}
        ${isActive ? "ring-2 ring-[#d58a96]/50" : ""}
        ${isPlaying ? "animate-breathe" : ""}
      `}
      style={cardToneStyle}
    >
      <p className="text-xs tracking-widest text-stone-400">FEATURED</p>

      <h1 className="mt-2 text-3xl font-semibold">
        {displayTitle}
      </h1>

      {/* Lead singer row */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-stone-300">
          {sequenceLabel ? `${sequenceLabel} by` : ""}
          {sequenceLabel ? " " : ""}
          {kirtan.lead_singer}
        </p>

        <div className="h-4 w-6 flex items-center justify-end">
          {isActive && isPlaying && <Equalizer />}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400">
        {kirtan.recorded_date ? (
          <span>
            {formatDateShort(
              kirtan.recorded_date,
              kirtan.recorded_date_precision,
            )}
          </span>
        ) : null}
        {kirtan.has_harmonium ? (
          <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            H
          </span>
        ) : null}
        {durationLabel ? (
          <span className="rounded-full bg-[#8fe1bf]/16 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c8f4e2]">
            {durationLabel}
          </span>
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
            className={`ml-auto flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
              isQueued
                ? "cursor-pointer border-[#8fe1bf]/35 bg-[#8fe1bf]/12 text-[#c8f4e2]"
                : "cursor-pointer border-[#e8b0b8]/40 bg-white/10 text-[#ffe7ea] hover:bg-white/20"
            }`}
            aria-label="Add to queue"
            title="Add to queue"
          >
            {isQueued ? "✓" : "+"}
          </button>
        ) : null}
      </div>

      {/* Action button */}
      <button
        disabled={isLoading && !isActive}
        onClick={onToggle}
        className={`
          mt-6 w-full rounded-xl py-3 font-medium transition
          bg-gradient-to-r from-[#12986f] to-[#20b584]
          hover:from-[#0f8a66] hover:to-[#17a97a]
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
