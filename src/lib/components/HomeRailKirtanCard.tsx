"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import { sfPlayFill } from "@bradleyhodges/sfsymbols";
import Equalizer from "@/lib/components/Equalizer";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { getRailCardPalette } from "@/lib/kirtanPresentation";
import { formatDateShort } from "@/lib/utils/date";
import type { KirtanSummary } from "@/types/kirtan";
import { radiusClassNames } from "@/lib/theme/radii";

type HomeRailKirtanCardProps = {
  kirtan: KirtanSummary;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onActivate: () => void;
  leadingSlot: ReactNode;
  trailingTopSlot?: ReactNode;
  opacity?: number;
};

export default function HomeRailKirtanCard({
  kirtan,
  isActive,
  isPlaying,
  isLoading,
  onActivate,
  leadingSlot,
  trailingTopSlot = null,
  opacity = 0.9,
}: HomeRailKirtanCardProps) {
  const sequenceLabel = kirtan.sequence_num ? `#${kirtan.sequence_num}` : null;
  const { borderTint, topGlow, bottomTint, midGlow } = getRailCardPalette(
    kirtan,
    opacity,
  );

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onActivate();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      className={`group flex h-[12.5rem] w-[10rem] shrink-0 flex-col border p-3.5 text-left shadow-[0_16px_36px_rgba(120,53,15,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(120,53,15,0.16)] ${radiusClassNames.card} ${
        isActive && isPlaying ? "animate-breathe" : ""
      }`}
      style={{
        borderColor: borderTint,
        background: `linear-gradient(180deg, ${topGlow} 0%, ${midGlow} 42%, ${bottomTint} 100%)`,
      }}
      aria-label={`Play ${formatKirtanTitle(kirtan.type, kirtan.title)}`}
    >
      <div className="flex items-start justify-between gap-3">
        {leadingSlot}
        <div className="flex items-center gap-1.5">{trailingTopSlot}</div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2">
        <p className="line-clamp-2 text-[0.98rem] font-semibold leading-snug text-stone-900">
          {formatKirtanTitle(kirtan.type, kirtan.title)}
        </p>
        <div className="min-h-[2.75rem]">
          {sequenceLabel ? (
            <div className="grid grid-cols-[auto,minmax(0,1fr)] items-start gap-x-1">
              <span className="shrink-0 pt-[1px] text-[11px] font-normal text-stone-500">
                {sequenceLabel} by
              </span>
              <p className="line-clamp-2 text-[0.92rem] leading-snug text-stone-600">
                {kirtan.lead_singer}
              </p>
            </div>
          ) : kirtan.lead_singer ? (
            <p className="line-clamp-2 text-[0.92rem] leading-snug text-stone-600">
              {kirtan.lead_singer}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0">
          {kirtan.recorded_date ? (
            <p className="truncate text-xs text-stone-500">
              {formatDateShort(
                kirtan.recorded_date,
                kirtan.recorded_date_precision,
              )}
            </p>
          ) : null}
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/88 text-[#9b5e52] shadow-sm transition group-hover:translate-x-0.5">
          {isActive && isLoading ? (
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          ) : isActive && isPlaying ? (
            <Equalizer className="h-3.5 gap-px" />
          ) : (
            <SFIcon icon={sfPlayFill} className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </div>
  );
}
