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
import type { KirtanSummary } from "@/types/kirtan";
import KirtanListItem from "@/lib/components/KirtanListItem";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatQueueDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
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
    dequeueById,
    duration,
    currentTime,
    isBuffering,
  } =
    useAudioPlayer();
  const shareKirtan = useKirtanShare();
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const queueDuration = queue.reduce(
    (sum, item) => sum + (item.duration_seconds ?? 0),
    0,
  );

  useEffect(() => {
    if (!shareNotice) return;
    const timer = setTimeout(() => setShareNotice(null), 1800);
    return () => clearTimeout(timer);
  }, [shareNotice]);

  useEffect(() => {
    if (!isQueueOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsQueueOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isQueueOpen]);

  useEffect(() => {
    if (!isQueueOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isQueueOpen]);

  if (!current) return null;

  const fullQueueDuration = queueDuration + (current.duration_seconds ?? 0);
  const fullQueueDurationLabel = formatQueueDuration(fullQueueDuration);
  const openQueue = () => {
    setSheetOffset(0);
    setIsQueueOpen(true);
  };

  const closeQueue = () => {
    setSheetOffset(0);
    setTouchStartY(null);
    setIsQueueOpen(false);
  };

  const playQueuedItem = (kirtan: KirtanSummary) => {
    dequeueById(kirtan.id);
    play(kirtan);
    closeQueue();
  };

  return (
    <>
      {isQueueOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/30 backdrop-blur-[1px]"
            onClick={closeQueue}
            aria-label="Close queue"
          />
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
            <div
              className="mx-auto max-w-md rounded-[28px] border border-[#efd8d1] bg-[linear-gradient(180deg,rgba(255,250,248,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_-14px_30px_rgba(120,53,15,0.14)] transition-transform"
              style={{ transform: `translateY(${sheetOffset}px)` }}
              onTouchStart={(event) => {
                setTouchStartY(event.touches[0]?.clientY ?? null);
              }}
              onTouchMove={(event) => {
                if (touchStartY === null) return;
                const delta = (event.touches[0]?.clientY ?? touchStartY) - touchStartY;
                setSheetOffset(Math.max(0, delta));
              }}
              onTouchEnd={() => {
                if (sheetOffset > 120) {
                  closeQueue();
                } else {
                  setSheetOffset(0);
                  setTouchStartY(null);
                }
              }}
            >
              <div className="flex justify-center pt-3">
                <button
                  type="button"
                  onClick={closeQueue}
                  className="h-1.5 w-12 rounded-full bg-stone-300"
                  aria-label="Dismiss queue"
                />
              </div>
              <div className="px-4 pb-4 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-900">Play queue</h2>
                    <p className="text-xs text-stone-500">
                      {queue.length} up next{fullQueueDurationLabel ? ` • ${fullQueueDurationLabel}` : ""}
                    </p>
                  </div>
                  {queue.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearQueue}
                      className="rounded-full border border-stone-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500 hover:bg-stone-50"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c98892]">
                      Now playing
                    </p>
                    <ul>
                      <KirtanListItem
                        kirtan={current}
                        isActive={true}
                        isPlaying={isPlaying()}
                        isLoading={isBuffering}
                        onToggle={() => {
                          if (isPlaying()) {
                            pause();
                          } else {
                            play(current);
                          }
                        }}
                      />
                    </ul>
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                      Up next
                    </p>
                    {queue.length > 0 ? (
                      <ul className="max-h-[45vh] space-y-2 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                        {queue.map((item) => (
                          <KirtanListItem
                            key={item.id}
                            kirtan={item}
                            isActive={false}
                            isPlaying={false}
                            isLoading={false}
                            onToggle={() => playQueuedItem(item)}
                            onDequeue={dequeueById}
                            isQueued={true}
                          />
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-xl border border-dashed border-stone-200 bg-white/80 px-3 py-4 text-sm text-stone-500">
                        No tracks queued.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#efd8d1] bg-white/95 text-stone-900 backdrop-blur">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#e7b9bf]/70 to-transparent" />
        {shareNotice ? (
          <div className="mx-auto mt-2 w-fit rounded-full bg-[#fff5f2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#c56a72]">
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
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-[#14946f]"
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
            style={{ accentColor: "#14946f" }}
            className="w-full text-[#14946f]"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] leading-none text-stone-400 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>

          {queue.length > 0 ? (
            <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
              <div className="flex min-w-0 items-center gap-2 truncate">
                <button
                  type="button"
                  onClick={openQueue}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  aria-label="Open queue"
                  title="Open queue"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M4.75 6.5a.75.75 0 0 1 .75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Zm0 5a.75.75 0 0 1 .75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Zm0 5a.75.75 0 0 1 .75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={openQueue}
                  className="flex min-w-0 items-center gap-2 truncate rounded-full px-1 py-0.5 hover:bg-stone-50"
                >
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ef] px-2 py-0.5">
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d7efe5] px-1.5 text-[10px] font-semibold text-[#2e8c6f]">
                      {queue.length}
                    </span>
                    {fullQueueDurationLabel ? (
                      <span className="text-[10px] font-medium text-[#2e8c6f]/85">
                        {fullQueueDurationLabel}
                      </span>
                    ) : null}
                  </div>
                  <span className="truncate">Up next: {queue[0]?.title}</span>
                </button>
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
    </>
  );
}
