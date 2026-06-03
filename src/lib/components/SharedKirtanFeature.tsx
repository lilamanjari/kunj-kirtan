"use client";

import { useEffect, useState } from "react";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import FeaturedKirtanCard from "@/lib/components/FeaturedKirtanCard";
import { homeSharedPalette } from "@/lib/theme/pagePalettes";
import { radiusClassNames } from "@/lib/theme/radii";
import type { KirtanSummary } from "@/types/kirtan";

type SharedKirtanFeatureProps = {
  kirtan: KirtanSummary | null;
  className?: string;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onEnqueue: (kirtan: KirtanSummary) => void;
  onDequeue: (id: string) => void;
  isQueued: boolean;
  onToggleFavorite: (kirtan: KirtanSummary) => void;
  isFavorited: boolean;
  onDismissedChange?: (dismissed: boolean) => void;
};

export default function SharedKirtanFeature({
  kirtan,
  className,
  isActive,
  isPlaying,
  isLoading,
  onToggle,
  onEnqueue,
  onDequeue,
  isQueued,
  onToggleFavorite,
  isFavorited,
  onDismissedChange,
}: SharedKirtanFeatureProps) {
  const dictionary = useDictionary();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const currentId = kirtan?.id ?? null;
  const dismissed = currentId !== null && dismissedId === currentId;
  const dismissing = currentId !== null && dismissingId === currentId;

  useEffect(() => {
    onDismissedChange?.(false);
  }, [currentId, onDismissedChange]);

  useEffect(() => {
    if (!dismissingId) return;

    const dismissTimer = window.setTimeout(() => {
      setDismissedId(dismissingId);
      setDismissingId(null);
      onDismissedChange?.(true);
    }, 260);

    return () => {
      window.clearTimeout(dismissTimer);
    };
  }, [dismissingId, onDismissedChange]);

  if (!kirtan || dismissed) return null;

  return (
    <div
      className={`overflow-hidden ${radiusClassNames.surface} transition-[max-height,opacity,transform,margin] duration-300 ease-out ${className ?? ""} ${
        dismissing
          ? "pointer-events-none max-h-0 -translate-y-2 opacity-0"
          : "max-h-[32rem] translate-y-0 opacity-100"
      }`}
    >
      <FeaturedKirtanCard
        kirtan={kirtan}
        isActive={isActive}
        isPlaying={isPlaying}
        isLoading={isLoading}
        onToggle={onToggle}
        onEnqueue={onEnqueue}
        onDequeue={onDequeue}
        isQueued={isQueued}
        onToggleFavorite={onToggleFavorite}
        isFavorited={isFavorited}
        palette={homeSharedPalette}
        label={dictionary.common.sharedWithYou}
        contextLine={dictionary.home.sharedKirtanContext}
        onDismiss={() => {
          if (currentId) {
            setDismissingId(currentId);
          }
        }}
        dismissLabel={dictionary.actions.dismiss}
      />
    </div>
  );
}
