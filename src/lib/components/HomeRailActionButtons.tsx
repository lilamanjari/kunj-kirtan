"use client";

import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import { sfSuitHeart, sfSuitHeartFill } from "@bradleyhodges/sfsymbols";
import type { KirtanSummary } from "@/types/kirtan";

type HomeRailActionButtonsProps = {
  kirtan: KirtanSummary;
  isFavorited: boolean;
  isQueued: boolean;
  onToggleFavorite: (kirtan: KirtanSummary) => void;
  onToggleQueue: (kirtan: KirtanSummary) => void;
  showFilledHeart?: boolean;
  mutedBackground?: boolean;
};

export default function HomeRailActionButtons({
  kirtan,
  isFavorited,
  isQueued,
  onToggleFavorite,
  onToggleQueue,
  showFilledHeart = false,
  mutedBackground = true,
}: HomeRailActionButtonsProps) {
  const baseButtonClass = mutedBackground
    ? "border-[#efd4cb] bg-white/82 text-[#cc7680] hover:bg-[#fff7f3]"
    : "border-[#efd4cb] bg-white text-[#cc7680] hover:bg-[#fff7f3]";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(kirtan);
        }}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
          isFavorited
            ? "border-[#f3c2ce] bg-[#fff1f5] text-[#c45d74]"
            : baseButtonClass
        }`}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <SFIcon
          icon={isFavorited || showFilledHeart ? sfSuitHeartFill : sfSuitHeart}
          className="h-3.5 w-3.5"
        />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleQueue(kirtan);
        }}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
          isQueued
            ? "border-[#d2eadf] bg-[#eef8f3] text-[#2e8c6f]"
            : baseButtonClass
        }`}
        aria-label={isQueued ? "Remove from queue" : "Add to queue"}
        title={isQueued ? "Remove from queue" : "Add to queue"}
      >
        <span className="text-[18px] leading-none">
          {isQueued ? "✓" : "+"}
        </span>
      </button>
    </div>
  );
}
