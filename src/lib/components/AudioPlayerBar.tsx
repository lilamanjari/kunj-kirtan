"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { useKirtanShare } from "@/lib/hooks/useKirtanShare";
import { useEffect, useState } from "react";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sf15ArrowTriangleheadClockwise,
  sf15ArrowTriangleheadCounterclockwise,
  sfBackwardEndFill,
  sfForwardEndFill,
  sfPauseFill,
  sfPlayFill,
} from "@bradleyhodges/sfsymbols";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function AudioPlayerBar() {
  const {
    progress,
    seekBy,
    seekTo,
    isPlaying,
    pause,
    play,
    playNext,
    playPrev,
    current,
    queue,
    clearQueue,
    duration,
    currentTime,
    isBuffering,
  } =
    useAudioPlayer();
  const shareKirtan = useKirtanShare();
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = setTimeout(() => setShareNotice(null), 1800);
    return () => clearTimeout(timer);
  }, [shareNotice]);

  if (!current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-rose-100 bg-white/95 text-stone-900 backdrop-blur">
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />
      {shareNotice ? (
        <div className="mx-auto mt-2 w-fit rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
          {shareNotice}
        </div>
      ) : null}
      <div className="mx-auto max-w-md px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={playPrev}
            className="text-stone-900 active:opacity-80"
            aria-label="Previous"
          >
            <SFIcon icon={sfBackwardEndFill} className="w-5 h-5" />
          </button>
          <button
            onClick={() => seekBy(-15)}
            className="text-stone-900 active:opacity-80"
          >
            <SFIcon
              icon={sf15ArrowTriangleheadCounterclockwise}
              className="w-8 h-8"
            />
          </button>
          <button
            onClick={() =>
              isPlaying() && current ? pause() : current && play(current)
            }
            className="text-stone-900 active:opacity-80"
            aria-label={isBuffering ? "Buffering" : "Play or pause"}
          >
            {isBuffering ? (
              // SVG spinner with SMIL animation for iOS/Safari reliability.
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-emerald-500"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.25"
                />
                <path
                  d="M12 3a9 9 0 0 1 9 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            ) : isPlaying() ? (
              <SFIcon icon={sfPauseFill} className="w-6 h-6" />
            ) : (
              <SFIcon icon={sfPlayFill} className="w-6 h-6 ml-1" />
            )}
          </button>
          <button
            onClick={() => seekBy(15)}
            className="text-stone-900 active:opacity-80"
          >
            <SFIcon icon={sf15ArrowTriangleheadClockwise} className="w-8 h-8" />
          </button>
          <button
            onClick={playNext}
            disabled={queue.length === 0}
            className={`active:opacity-80 ${
              queue.length === 0 ? "text-stone-300" : "text-stone-900"
            }`}
            aria-label="Next"
          >
            <SFIcon icon={sfForwardEndFill} className="w-5 h-5" />
          </button>
          <div className="ml-2 flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-stone-500">
              {current.type === "MM" && current.sequence_num
                ? `#${current.sequence_num} by ${
                    current.lead_singer ?? "Unknown singer"
                  }`
                : current.lead_singer ?? "Unknown singer"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              shareKirtan(current).then((result) => {
                if (result?.copied) {
                  setShareNotice("Link copied");
                }
              });
            }}
            className="text-stone-700 active:opacity-80"
            aria-label="Share"
            title="Share"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12 3a1 1 0 0 1 .72.31l3.5 3.6a1 1 0 1 1-1.44 1.38L13 6.7V14a1 1 0 1 1-2 0V6.7L9.22 8.29A1 1 0 0 1 7.78 6.9l3.5-3.6A1 1 0 0 1 12 3Zm-6 11a1 1 0 0 1 1 1v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3a1 1 0 1 1 2 0v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => seekTo(Number(e.target.value))}
          style={{ accentColor: "#10b981" }}
          className="w-full accent-emerald-500 text-emerald-500"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] leading-none text-stone-400 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>

        {queue.length > 0 ? (
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center gap-2 truncate">
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-700">
                {queue.length}
              </span>
              <span className="truncate">Up next: {queue[0]?.title}</span>
            </div>
            <button
              type="button"
              onClick={clearQueue}
              className="ml-3 shrink-0 rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 hover:bg-stone-50"
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
