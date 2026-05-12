import type { CSSProperties } from "react";
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
} from "@bradleyhodges/sfsymbols";

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
  tone?: "default" | "home" | "maha_mantras" | "bhajans" | "lead" | "occasion";
  contextLine?: string;
};

type FeaturedCardPalette = {
  cardClassName: string;
  cardStyle?: CSSProperties;
  ringColor: string;
  labelColor: string;
  contextColor: string;
  metaColor: string;
  bodyColor: string;
  harmoniumClassName: string;
  durationClassName: string;
  inactiveActionClassName: string;
  activeFavoriteClassName: string;
  activeQueueClassName: string;
  buttonClassName: string;
};

const LIGHT_ACTION_CLASS =
  "cursor-pointer border-[#ecd5cf] bg-white/80 text-[#bc7b84] hover:bg-white";

const featuredCardPalettes: Record<
  Exclude<FeaturedKirtanCardProps["tone"], "default">,
  FeaturedCardPalette
> = {
  home: {
    cardClassName:
      "border border-[#f2b79d] text-[#5e433a] shadow-[0_20px_42px_rgba(164,112,87,0.16)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 248, 243, 0.9)",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,250,246,0.92) 0%, rgba(252,241,235,0.92) 56%, rgba(249,232,228,0.92) 100%)",
    },
    ringColor: "ring-[#ddb5c0]/55",
    labelColor: "text-[#9d7b70]",
    contextColor: "text-[#b98473]",
    metaColor: "text-[#9c7b72]",
    bodyColor: "text-[#87675f]",
    harmoniumClassName: "bg-amber-100 text-amber-700",
    durationClassName: "bg-[#e4f5ee] text-[#39866d]",
    inactiveActionClassName: LIGHT_ACTION_CLASS,
    activeFavoriteClassName:
      "cursor-pointer border-[#f0c8d1] bg-[#fff2f5] text-[#c46a7f]",
    activeQueueClassName:
      "cursor-pointer border-[#cfe9de] bg-[#eff8f3] text-[#2e8c6f]",
    buttonClassName:
      "bg-gradient-to-r from-[#64bf98] to-[#72c8a6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#56b38c] hover:to-[#67bc9a]",
  },
  maha_mantras: {
    cardClassName:
      "border border-[#eed9c9] text-[#5f4037] shadow-[0_20px_42px_rgba(175,129,93,0.14)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 249, 243, 0.92)",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,251,246,0.94) 0%, rgba(252,243,236,0.92) 56%, rgba(247,234,225,0.9) 100%)",
    },
    ringColor: "ring-[#e1c2a8]/65",
    labelColor: "text-[#a17968]",
    contextColor: "text-[#bc8a72]",
    metaColor: "text-[#9f7d6e]",
    bodyColor: "text-[#866257]",
    harmoniumClassName: "bg-amber-100 text-amber-700",
    durationClassName: "bg-[#e4f5ee] text-[#39866d]",
    inactiveActionClassName:
      "cursor-pointer border-[#ead8cf] bg-white/82 text-[#b67772] hover:bg-white",
    activeFavoriteClassName:
      "cursor-pointer border-[#efcbc3] bg-[#fff4f1] text-[#ca746b]",
    activeQueueClassName:
      "cursor-pointer border-[#d3eadf] bg-[#eef8f3] text-[#2e8c6f]",
    buttonClassName:
      "bg-gradient-to-r from-[#67bf95] to-[#79c9a4] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#58b287] hover:to-[#6cbd98]",
  },
  bhajans: {
    cardClassName:
      "border border-[#efd6df] text-[#5b3f48] shadow-[0_20px_42px_rgba(164,114,130,0.14)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 248, 247, 0.92)",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,250,249,0.94) 0%, rgba(251,241,242,0.92) 56%, rgba(246,232,236,0.9) 100%)",
    },
    ringColor: "ring-[#e2bfd0]/65",
    labelColor: "text-[#9f7381]",
    contextColor: "text-[#bb8390]",
    metaColor: "text-[#9a7681]",
    bodyColor: "text-[#82606a]",
    harmoniumClassName: "bg-amber-100 text-amber-700",
    durationClassName: "bg-[#e4f5ee] text-[#39866d]",
    inactiveActionClassName:
      "cursor-pointer border-[#ead5db] bg-white/82 text-[#b97886] hover:bg-white",
    activeFavoriteClassName:
      "cursor-pointer border-[#efc6d3] bg-[#fff1f6] text-[#c26680]",
    activeQueueClassName:
      "cursor-pointer border-[#d3eadf] bg-[#eef8f3] text-[#2e8c6f]",
    buttonClassName:
      "bg-gradient-to-r from-[#69bd97] to-[#79c6a5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#5daf89] hover:to-[#6fbb9b]",
  },
  lead: {
    cardClassName:
      "border border-[#e7d6c8] text-[#5c463e] shadow-[0_20px_42px_rgba(155,124,99,0.13)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 249, 244, 0.92)",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,251,247,0.95) 0%, rgba(248,241,235,0.92) 56%, rgba(238,246,238,0.9) 100%)",
    },
    ringColor: "ring-[#dbbfac]/65",
    labelColor: "text-[#9e7b69]",
    contextColor: "text-[#b48d75]",
    metaColor: "text-[#96786a]",
    bodyColor: "text-[#7d665a]",
    harmoniumClassName: "bg-amber-100 text-amber-700",
    durationClassName: "bg-[#e4f5ee] text-[#39866d]",
    inactiveActionClassName:
      "cursor-pointer border-[#e5d7cf] bg-white/82 text-[#b07d6f] hover:bg-white",
    activeFavoriteClassName:
      "cursor-pointer border-[#efccc3] bg-[#fff3ef] text-[#c36d66]",
    activeQueueClassName:
      "cursor-pointer border-[#d3eadf] bg-[#eef8f3] text-[#2e8c6f]",
    buttonClassName:
      "bg-gradient-to-r from-[#84ba8b] to-[#9cc4a0] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#76ad7d] hover:to-[#8eb894]",
  },
  occasion: {
    cardClassName:
      "border border-[#e8d8cb] text-[#5b463c] shadow-[0_20px_42px_rgba(157,124,95,0.13)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 249, 244, 0.92)",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,251,247,0.95) 0%, rgba(250,242,236,0.92) 56%, rgba(245,234,226,0.9) 100%)",
    },
    ringColor: "ring-[#dec2ae]/65",
    labelColor: "text-[#9b7a69]",
    contextColor: "text-[#b68a72]",
    metaColor: "text-[#95786c]",
    bodyColor: "text-[#7d665b]",
    harmoniumClassName: "bg-amber-100 text-amber-700",
    durationClassName: "bg-[#e4f5ee] text-[#39866d]",
    inactiveActionClassName:
      "cursor-pointer border-[#e7d7ce] bg-white/82 text-[#b17a6d] hover:bg-white",
    activeFavoriteClassName:
      "cursor-pointer border-[#efcdc6] bg-[#fff3f0] text-[#c56f66]",
    activeQueueClassName:
      "cursor-pointer border-[#d3eadf] bg-[#eef8f3] text-[#2e8c6f]",
    buttonClassName:
      "bg-gradient-to-r from-[#8bb88d] to-[#a4c8a3] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-[#7dac80] hover:to-[#96bd95]",
  },
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
  tone = "default",
  contextLine,
}: FeaturedKirtanCardProps) {
  const sequenceLabel = getKirtanSequenceLabel(kirtan.sequence_num);
  const durationLabel = formatKirtanDuration(kirtan.duration_seconds);
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const palette =
    tone === "default" ? null : featuredCardPalettes[tone];
  const cardToneClass =
    palette?.cardClassName ??
    "bg-gradient-to-br from-[#241a18] via-[#2f201d] to-[#5d1b33] text-white shadow-[0_18px_36px_rgba(120,53,15,0.18)]";
  const cardToneStyle = palette?.cardStyle;

  return (
    <section
      className={`
        relative rounded-[1.45rem] p-6 transition
        ${cardToneClass}
        ${isActive ? `ring-2 ${palette?.ringColor ?? "ring-[#d58a96]/50"}` : ""}
        ${isPlaying ? "animate-breathe" : ""}
      `}
      style={cardToneStyle}
    >
      <p
        className={`text-xs font-medium uppercase tracking-[0.16em] ${
          palette?.labelColor ?? "text-white/58"
        }`}
      >
        Featured
      </p>
      {contextLine ? (
        <p
          className={`mt-2 text-sm font-medium ${
            palette?.contextColor ?? "text-[#e4b6a7]"
          }`}
        >
          {contextLine}
        </p>
      ) : null}

      <h1 className={`${contextLine ? "mt-3" : "mt-2"} text-3xl font-semibold`}>
        {displayTitle}
      </h1>

      {/* Lead singer row */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className={palette?.bodyColor ?? "text-stone-300"}>
          {sequenceLabel ? `${sequenceLabel} by` : ""}
          {sequenceLabel ? " " : ""}
          {kirtan.lead_singer}
        </p>

        <div className="h-4 w-6 flex items-center justify-end">
          {isActive && isPlaying && <Equalizer />}
        </div>
      </div>

      <div
        className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${
          palette?.metaColor ?? "text-stone-400"
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
              palette?.harmoniumClassName ?? "bg-amber-400/20 text-amber-200"
            }`}
          >
            H
          </span>
        ) : null}
        {durationLabel ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              palette?.durationClassName ?? "bg-[#8fe1bf]/16 text-[#c8f4e2]"
            }`}
          >
            {durationLabel}
          </span>
        ) : null}
        {onToggleFavorite || onEnqueue ? (
          <div className="ml-auto flex items-center gap-2">
            {onToggleFavorite ? (
              <button
                type="button"
                onClick={() => onToggleFavorite(kirtan)}
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                  isFavorited
                    ? palette?.activeFavoriteClassName ??
                      "cursor-pointer border-[#f3c2ce]/60 bg-[#fff1f5]/12 text-[#ffd7e1]"
                    : palette?.inactiveActionClassName ??
                      "cursor-pointer border-[#e8b0b8]/40 bg-white/10 text-[#ffe7ea] hover:bg-white/20"
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
                    ? palette?.activeQueueClassName ??
                      "cursor-pointer border-[#8fe1bf]/35 bg-[#8fe1bf]/12 text-[#c8f4e2]"
                    : palette?.inactiveActionClassName ??
                      "cursor-pointer border-[#e8b0b8]/40 bg-white/10 text-[#ffe7ea] hover:bg-white/20"
                }`}
                aria-label={isQueued ? "Remove from queue" : "Add to queue"}
                title={isQueued ? "Remove from queue" : "Add to queue"}
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
          mt-6 w-full rounded-xl py-3 font-medium transition
          ${palette?.buttonClassName ?? "bg-gradient-to-r from-[#12986f] to-[#20b584] hover:from-[#0f8a66] hover:to-[#17a97a]"}
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
