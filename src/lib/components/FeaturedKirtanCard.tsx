import Equalizer from "@/lib/components/Equalizer";
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
}: FeaturedKirtanCardProps) {
  const sequenceLabel = kirtan.sequence_num ? `#${kirtan.sequence_num}` : null;
  const durationLabel = formatDuration(kirtan.duration_seconds);

  return (
    <section
      className={`
        relative rounded-2xl p-6 shadow-lg transition
        bg-gradient-to-br from-stone-900 via-stone-900 to-rose-950 text-white
        ${isActive ? "ring-2 ring-rose-400/50" : ""}
        ${isPlaying ? "animate-breathe" : ""}
      `}
    >
      <p className="text-xs tracking-widest text-stone-400">FEATURED</p>

      <h1 className="mt-2 text-3xl font-semibold">
        {kirtan.title ?? "Maha Mantra"}
      </h1>

      {/* Lead singer row */}
      <div className="mt-2 flex items-center justify-between">
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
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
            {durationLabel}
          </span>
        ) : null}
      </div>

      {/* Action button */}
      <button
        disabled={isLoading && !isActive}
        onClick={onToggle}
        className={`
          mt-6 w-full rounded-xl py-3 font-medium transition
          bg-gradient-to-r from-emerald-600 to-emerald-500
          hover:from-emerald-500 hover:to-emerald-400
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
