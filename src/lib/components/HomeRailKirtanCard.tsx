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
import {
  displayHeadingClassName,
  playCircleButtonClassName,
} from "@/lib/theme/componentThemes";

type HomeRailKirtanCardProps = {
  kirtan: KirtanSummary;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onActivate: () => void;
  leadingSlot: ReactNode;
  trailingTopSlot?: ReactNode;
};

export default function HomeRailKirtanCard({
  kirtan,
  isActive,
  isPlaying,
  isLoading,
  onActivate,
  leadingSlot,
  trailingTopSlot = null,
}: HomeRailKirtanCardProps) {
  const sequenceLabel = kirtan.sequence_num ? `#${kirtan.sequence_num}` : null;
  const { borderTint, backgroundTint } = getRailCardPalette(kirtan);

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
      className={`group flex h-[12.5rem] w-[10rem] shrink-0 flex-col border p-3.5 text-left ${radiusClassNames.card} ${
        isActive && isPlaying ? "animate-breathe" : ""
      }`}
      style={{
        borderColor: borderTint,
        backgroundColor: backgroundTint,
      }}
      aria-label={`Play ${formatKirtanTitle(kirtan.type, kirtan.title)}`}
    >
      <div className="flex items-start justify-between gap-3">
        {leadingSlot}
        <div className="flex items-center gap-1.5">{trailingTopSlot}</div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2">
        <p
          className={`line-clamp-2 text-[1.2rem] leading-[1.02] text-[color:var(--theme-page-home-text)] ${displayHeadingClassName}`}
        >
          {formatKirtanTitle(kirtan.type, kirtan.title)}
        </p>
        <div className="min-h-[2.75rem]">
          {sequenceLabel ? (
            <div className="grid grid-cols-[auto,minmax(0,1fr)] items-start gap-x-1">
              <span className="shrink-0 pt-[1px] text-[10px] font-normal text-(--theme-page-home-section-label)">
                {sequenceLabel} by
              </span>
              <p className="line-clamp-2 text-[0.72rem] leading-snug text-(--theme-page-home-section-label)">
                {kirtan.lead_singer}
              </p>
            </div>
          ) : kirtan.lead_singer ? (
            <p className="line-clamp-2 text-[0.72rem] leading-snug text-(--theme-page-home-section-label)">
              {kirtan.lead_singer}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0">
          {kirtan.recorded_date ? (
            <p className="truncate text-xs text-(--theme-page-home-muted)">
              {formatDateShort(
                kirtan.recorded_date,
                kirtan.recorded_date_precision,
              )}
            </p>
          ) : null}
        </div>
        <span className={`h-8 w-8 shrink-0 ${playCircleButtonClassName}`}>
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
