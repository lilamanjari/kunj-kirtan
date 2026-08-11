"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import OfflineDownloadBadge from "@/lib/components/OfflineDownloadBadge";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import { sfSuitHeart, sfSuitHeartFill } from "@bradleyhodges/sfsymbols";
import type { KirtanSummary } from "@/types/kirtan";
import {
  iconButtonInactiveClassName,
  favoriteActiveClassName,
  queueActiveClassName,
} from "@/lib/theme/componentThemes";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

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
  const dictionary = useDictionary();
  const { isOfflineAvailable, isOfflineDownloading } = useAudioPlayer();
  const baseButtonClass = mutedBackground
    ? iconButtonInactiveClassName.replace(
        "bg-[var(--theme-icon-button-bg-rest)]",
        "bg-white/82",
      )
    : iconButtonInactiveClassName;

  return (
    <div className="flex items-center gap-1.5">
      <OfflineDownloadBadge
        downloaded={isOfflineAvailable(kirtan.id)}
        downloading={isOfflineDownloading(kirtan.id)}
      />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(kirtan);
        }}
        className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-full border transition ${
          isFavorited ? favoriteActiveClassName : baseButtonClass
        }`}
        aria-label={
          isFavorited
            ? dictionary.actions.removeFromFavorites
            : dictionary.actions.addToFavorites
        }
        title={
          isFavorited
            ? dictionary.actions.removeFromFavorites
            : dictionary.actions.addToFavorites
        }
      >
        <SFIcon
          icon={isFavorited || showFilledHeart ? sfSuitHeartFill : sfSuitHeart}
          className="h-3.25 w-3.25"
        />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleQueue(kirtan);
        }}
        className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-full border transition ${
          isQueued ? queueActiveClassName : baseButtonClass
        }`}
        aria-label={
          isQueued
            ? dictionary.actions.removeFromQueue
            : dictionary.actions.addToQueue
        }
        title={
          isQueued
            ? dictionary.actions.removeFromQueue
            : dictionary.actions.addToQueue
        }
      >
        <span className="text-[16px] leading-none">
          {isQueued ? "✓" : "+"}
        </span>
      </button>
    </div>
  );
}
