"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { SFIcon } from "@bradleyhodges/sfsymbols-react";
import {
  sf15ArrowTriangleheadClockwise,
  sf15ArrowTriangleheadCounterclockwise,
  sfPauseFill,
  sfPlayFill,
} from "@bradleyhodges/sfsymbols";

export default function AudioPlayerBar() {
  const { progress, seek, isPlaying, pause, play, current } = useAudioPlayer();

  if (!current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-rose-100 bg-white/95 text-stone-900 backdrop-blur">
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />
      <div className="mx-auto max-w-md px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => seek(-15)}
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
            onClick={() => seek(15)}
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
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </div>
    </div>
  );
}
