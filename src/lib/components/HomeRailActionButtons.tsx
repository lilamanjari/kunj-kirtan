"use client";

import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import { sfSuitHeart, sfSuitHeartFill } from "@bradleyhodges/sfsymbols";
import type { KirtanSummary } from "@/types/kirtan";
import {
  iconButtonInactiveClassName,
  favoriteActiveClassName,
  queueActiveClassName,
} from "@/lib/theme/componentThemes";

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
    ? iconButtonInactiveClassName.replace(
        "bg-[var(--theme-icon-button-bg-rest)]",
        "bg-white/82",
      )
    : iconButtonInactiveClassName;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(kirtan);
        }}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
          isFavorited ? favoriteActiveClassName : baseButtonClass
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
          isQueued ? queueActiveClassName : baseButtonClass
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
