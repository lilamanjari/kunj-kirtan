"use client";

import Link from "next/link";
import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { formatDateLong } from "@/lib/utils/date";
import type { KirtanSummary } from "@/types/kirtan";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sfPlayFill,
  sfSuitHeartFill,
} from "@bradleyhodges/sfsymbols";
import Equalizer from "@/lib/components/Equalizer";

type HomeFavoritesStripProps = {
  favorites: KirtanSummary[];
  loaded: boolean;
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

function hashHue(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return hash;
}

export default function HomeFavoritesStrip({
  favorites,
  loaded,
}: HomeFavoritesStripProps) {
  const { play, isActive, isPlaying, isLoading } = useAudioPlayer();

  if (!loaded || favorites.length === 0) {
    return null;
  }

  const previewFavorites = favorites.slice(0, 4);

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs uppercase tracking-wide text-stone-500">
            Favorites
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Your saved kirtans, ready to play.
          </p>
        </div>
        <Link
          href="/favorites"
          className="shrink-0 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#9b5e52] shadow-sm transition hover:bg-rose-50"
        >
          View all
        </Link>
      </div>

      <div className="mt-3 -mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 overflow-y-visible py-1 pr-8">
          {previewFavorites.map((kirtan) => {
            const durationLabel = formatDuration(kirtan.duration_seconds);
            const sequenceLabel = kirtan.sequence_num ? `#${kirtan.sequence_num}` : null;
            const baseHue = hashHue(kirtan.id);
            const tintHue = kirtan.type === "BHJ" ? (baseHue + 340) % 360 : baseHue;
            const borderTint = kirtan.is_rare_gem
              ? "rgba(251, 191, 36, 0.65)"
              : `hsla(${tintHue}, 72%, 82%, 1)`;
            const topGlow = kirtan.is_rare_gem
              ? "rgba(255, 251, 242, 0.98)"
              : `hsla(${tintHue}, 70%, 98%, 0.99)`;
            const bottomTint = kirtan.is_rare_gem
              ? "rgba(255, 252, 246, 0.98)"
              : `hsla(${tintHue}, 58%, 96%, 0.99)`;
            const active = isActive(kirtan);

            return (
              <button
                key={kirtan.id}
                type="button"
                onClick={() => play(kirtan)}
                className={`group flex h-[12.5rem] w-[10rem] shrink-0 flex-col rounded-[1.2rem] border p-3.5 text-left shadow-[0_16px_36px_rgba(120,53,15,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(120,53,15,0.16)] ${
                  active && isPlaying() ? "animate-breathe" : ""
                }`}
                style={{
                  borderColor: borderTint,
                  background: `linear-gradient(180deg, ${topGlow} 0%, rgba(255,255,255,0.97) 42%, ${bottomTint} 100%)`,
                }}
                aria-label={`Play ${formatKirtanTitle(kirtan.type, kirtan.title)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0f4] text-[#c45d74]">
                    <SFIcon icon={sfSuitHeartFill} className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {kirtan.has_harmonium ? (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        H
                      </span>
                    ) : null}
                    {durationLabel ? (
                      <span className="rounded-full bg-[#e8f6ef] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#2e8c6f]">
                        {durationLabel}
                      </span>
                    ) : null}
                  </div>
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
                        {formatDateLong(
                          kirtan.recorded_date,
                          kirtan.recorded_date_precision,
                        )}
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/88 text-[#9b5e52] shadow-sm transition group-hover:translate-x-0.5">
                    {active && isLoading() ? (
                      <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
                    ) : active && isPlaying() ? (
                      <Equalizer />
                    ) : (
                      <SFIcon icon={sfPlayFill} className="h-3.5 w-3.5" />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
