import Equalizer from "@/lib/components/Equalizer";
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

export default function FeaturedKirtanCard({
  kirtan,
  isActive,
  isPlaying,
  isLoading,
  onToggle,
}: FeaturedKirtanCardProps) {
  return (
    <section
      className={`
        relative rounded-3xl p-6 shadow-lg transition
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
        <p className="text-stone-300">{kirtan.lead_singer}</p>

        <div className="h-4 w-6 flex items-center justify-end">
          {isActive && isPlaying && <Equalizer />}
        </div>
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
