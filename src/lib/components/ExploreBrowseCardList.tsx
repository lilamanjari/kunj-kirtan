"use client";

import { useState } from "react";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import { sfMusicNote } from "@bradleyhodges/sfsymbols";
import {
  displayHeadingClassName,
  neutralCircleButtonClassName,
} from "@/lib/theme/componentThemes";
import { radiusClassNames } from "@/lib/theme/radii";

export type ExploreBrowseCardItem = {
  id: string;
  title: string;
  href: string;
  countText: string;
  imageSrc?: string | null;
  fallbackText?: string | null;
};

function BrowseCardImage({
  imageSrc,
  fallbackText,
}: {
  imageSrc?: string | null;
  fallbackText?: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageSrc || imageFailed) {
    if (fallbackText) {
      return (
        <span className="text-[1.6rem] font-semibold uppercase tracking-[-0.02em] text-[color:var(--theme-page-home-section-label)]">
          {fallbackText}
        </span>
      );
    }

    return (
      <SFIcon
        icon={sfMusicNote}
        className="h-6 w-6 text-[color:var(--theme-page-home-section-label)]"
      />
    );
  }

  return (
    <img
      // Keeps the browser from visually reusing a stale bitmap when we bump
      // the transformed image URL during design-time cache debugging.
      key={imageSrc}
      src={imageSrc}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => setImageFailed(true)}
    />
  );
}

export default function ExploreBrowseCardList({
  items,
  emptyMessage,
}: {
  items: ExploreBrowseCardItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div
        className={`${radiusClassNames.card} border border-dashed border-stone-200 bg-white/80 px-4 py-8 text-center text-sm text-stone-500 shadow-[0_12px_28px_rgba(120,53,15,0.08)]`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <LocalizedLink
            href={item.href}
            className={`group flex items-center gap-4 px-4 py-2 transition hover:-translate-y-0.5 ${radiusClassNames.surface} border border-(--theme-page-home-border) bg-(--theme-page-home-discovery-blush) shadow-[0_18px_34px_var(--theme-page-home-shadow)]`}
          >
            <div className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(180deg,rgba(255,251,248,0.98)_0%,rgba(247,239,233,0.98)_100%)] shadow-[inset_0_0_0_1px_rgba(236,220,210,0.72)]">
              <BrowseCardImage
                imageSrc={item.imageSrc}
                fallbackText={item.fallbackText}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`${displayHeadingClassName} line-clamp-2 text-[1.2rem] leading-[1.02] text-[color:var(--theme-page-home-text)] sm:text-[1.3rem]`}
              >
                {item.title}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[0.65rem] leading-none text-[color:var(--theme-page-home-section-label)]">
                <span>{item.countText}</span>
              </div>
            </div>

            <span
              className={`${neutralCircleButtonClassName} h-10 w-10 shrink-0 text-lg`}
            >
              →
            </span>
          </LocalizedLink>
        </li>
      ))}
    </ul>
  );
}
