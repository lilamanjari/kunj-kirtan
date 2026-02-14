"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sf15ArrowTriangleheadClockwise,
  sf15ArrowTriangleheadCounterclockwise,
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
    current,
    queue,
    clearQueue,
    duration,
    currentTime,
  } =
    useAudioPlayer();

  if (!current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-rose-100 bg-white/95 text-stone-900 backdrop-blur">
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />
      <div className="mx-auto max-w-md px-4 py-3">
        <div className="flex items-center gap-3">
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
          >
            {isPlaying() ? (
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
          <div className="ml-2 flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-stone-500">
              {current.lead_singer}
            </p>
          </div>
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
        <div className="-mt-2 flex items-center justify-between text-[10px] leading-none text-stone-400 tabular-nums">
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
