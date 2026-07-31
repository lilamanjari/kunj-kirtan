"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { AdminKirtanDetail } from "@/lib/admin/types";
import {
  ADMIN_AUDIO_ACCEPT,
  MAX_ADMIN_AUDIO_UPLOAD_BYTES,
  formatBytes,
  isAllowedAdminAudioFile,
} from "@/lib/admin/audioUpload";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

type AdminKirtanAudioPlayerProps = {
  kirtanId: string;
  title: string;
  audioUrl: string | null;
  waveformUrl: string | null;
  fileName: string | null;
  durationSeconds: number | null;
  onAudioReplaced: (kirtan: AdminKirtanDetail) => void;
};

const WAVEFORM_BAR_COUNT = 1800;

type ZoomLevel = "fit" | "focus" | "detail";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTrackWidth({
  viewportWidth,
  duration,
  zoomLevel,
}: {
  viewportWidth: number;
  duration: number;
  zoomLevel: ZoomLevel;
}) {
  if (viewportWidth <= 0) {
    return 0;
  }

  if (zoomLevel === "fit") {
    return viewportWidth;
  }

  const focusMultiplier = clamp(duration / 300, 2.5, 8);
  const detailMultiplier = clamp(duration / 90, 6, 24);

  return Math.round(
    viewportWidth *
      (zoomLevel === "focus" ? focusMultiplier : detailMultiplier),
  );
}

function getWaveformGutterWidth(viewportWidth: number, zoomLevel: ZoomLevel) {
  if (zoomLevel === "fit") {
    return 0;
  }

  return Math.max(0, Math.round(viewportWidth / 2));
}

function buildWaveformPeaks(channelData: Float32Array, barCount: number) {
  if (channelData.length === 0 || barCount <= 0) {
    return [];
  }

  const blockSize = Math.max(1, Math.floor(channelData.length / barCount));
  const peaks: number[] = [];

  for (let index = 0; index < barCount; index += 1) {
    const start = index * blockSize;
    const end =
      index === barCount - 1
        ? channelData.length
        : Math.min(channelData.length, start + blockSize);

    let sumSquares = 0;
    let sampleCount = 0;
    let localPeak = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const amplitude = Math.abs(channelData[sampleIndex] ?? 0);
      sumSquares += amplitude * amplitude;
      sampleCount += 1;

      if (amplitude > localPeak) {
        localPeak = amplitude;
      }
    }

    const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
    peaks.push(rms * 0.7 + localPeak * 0.3);
  }

  const maxPeak = Math.max(...peaks, 0);
  if (maxPeak <= 0) {
    return peaks.map(() => 0.16);
  }

  return peaks.map((peak) => {
    const normalized = peak / maxPeak;
    const eased = Math.pow(normalized, 0.75);
    return Math.max(0.08, eased);
  });
}

function compressPeaks(peaks: number[], targetCount: number) {
  if (peaks.length <= targetCount || targetCount <= 0) {
    return peaks;
  }

  const blockSize = peaks.length / targetCount;
  const compressed: number[] = [];

  for (let index = 0; index < targetCount; index += 1) {
    const start = Math.floor(index * blockSize);
    const end = Math.min(peaks.length, Math.floor((index + 1) * blockSize));

    let maxPeak = 0;
    for (let peakIndex = start; peakIndex < end; peakIndex += 1) {
      maxPeak = Math.max(maxPeak, peaks[peakIndex] ?? 0);
    }

    compressed.push(maxPeak || peaks[start] || 0.08);
  }

  return compressed;
}

export function AdminKirtanAudioPlayer({
  kirtanId,
  title,
  audioUrl,
  waveformUrl,
  fileName,
  durationSeconds,
  onAudioReplaced,
}: AdminKirtanAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nudgePreviewTimeoutRef = useRef<number | null>(null);
  const suppressScrollSyncRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isWaveformLoading, setIsWaveformLoading] = useState(false);
  const [waveformError, setWaveformError] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [replaceState, setReplaceState] = useState<"idle" | "uploading">(
    "idle",
  );
  const [trimState, setTrimState] = useState<"idle" | "trimming">("idle");
  const [trimModeOpen, setTrimModeOpen] = useState(false);
  const [replaceMessage, setReplaceMessage] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number | null>(null);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(
    durationSeconds && durationSeconds > 900 ? "detail" : "focus",
  );

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || durationSeconds || 0);
      setError(null);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      setIsPlaying(false);
      setError("Audio could not be played.");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [durationSeconds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(durationSeconds ?? 0);
    setError(null);
    setReplaceMessage(null);
    setTrimModeOpen(false);
    setTrimStart(null);
    setTrimEnd(null);

    if (!audioUrl) {
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.src = audioUrl;
    audio.load();
  }, [audioUrl, durationSeconds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      setViewportWidth(container.clientWidth);
      setScrollOffset(container.scrollLeft);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!waveformUrl) {
      setWaveformPeaks([]);
      setIsWaveformLoading(false);
      setWaveformError(null);
      return;
    }

    const nextWaveformUrl = waveformUrl;
    let cancelled = false;
    setIsWaveformLoading(true);
    setWaveformError(null);

    async function loadWaveform() {
      try {
        const response = await fetch(nextWaveformUrl, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Waveform request failed (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error("This browser does not support waveform decoding.");
        }

        const audioContext = new AudioContextClass();

        try {
          const audioBuffer = await audioContext.decodeAudioData(
            arrayBuffer.slice(0),
          );
          const peaks = buildWaveformPeaks(
            audioBuffer.getChannelData(0),
            WAVEFORM_BAR_COUNT,
          );

          if (!cancelled) {
            setWaveformPeaks(peaks);
          }
        } finally {
          void audioContext.close();
        }
      } catch {
        if (!cancelled) {
          setWaveformPeaks([]);
          setWaveformError(
            "Waveform preview could not be generated for this file.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsWaveformLoading(false);
        }
      }
    }

    void loadWaveform();

    return () => {
      cancelled = true;
    };
  }, [waveformUrl]);

  const progressRatio =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const trackWidth = getTrackWidth({ viewportWidth, duration, zoomLevel });
  const waveformGutterWidth = getWaveformGutterWidth(viewportWidth, zoomLevel);
  const totalScrollableWidth = trackWidth + waveformGutterWidth * 2;
  const displayedPeaks =
    waveformPeaks.length > 0
      ? compressPeaks(
          waveformPeaks,
          zoomLevel === "fit"
            ? 120
            : zoomLevel === "focus"
              ? 320
              : waveformPeaks.length,
        )
      : Array.from(
          {
            length:
              zoomLevel === "fit"
                ? 120
                : zoomLevel === "focus"
                  ? 320
                  : WAVEFORM_BAR_COUNT,
          },
          () => 0.18,
        );
  const visibleStartRatio =
    trackWidth > 0
      ? clamp((scrollOffset - waveformGutterWidth) / trackWidth, 0, 1)
      : 0;
  const visibleEndRatio =
    trackWidth > 0
      ? clamp(
          (scrollOffset + viewportWidth - waveformGutterWidth) / trackWidth,
          0,
          1,
        )
      : 1;
  const visibleStartTime = duration * visibleStartRatio;
  const visibleEndTime = duration * visibleEndRatio;
  const trimStartRatio =
    trimStart !== null && duration > 0
      ? clamp(trimStart / duration, 0, 1)
      : null;
  const trimEndRatio =
    trimEnd !== null && duration > 0 ? clamp(trimEnd / duration, 0, 1) : null;
  const effectiveTrimStart = trimStart ?? 0;
  const effectiveTrimEnd = trimEnd ?? duration;
  const trimSelectionIsValid =
    duration > 0 &&
    Number.isFinite(effectiveTrimStart) &&
    Number.isFinite(effectiveTrimEnd) &&
    effectiveTrimEnd > effectiveTrimStart &&
    (trimStart !== null || trimEnd !== null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || trackWidth <= 0 || duration <= 0) {
      return;
    }

    if (zoomLevel === "fit") {
      if (container.scrollLeft !== 0) {
        suppressScrollSyncRef.current = true;
        container.scrollLeft = 0;
        setScrollOffset(0);
        requestAnimationFrame(() => {
          suppressScrollSyncRef.current = false;
        });
      }
      return;
    }

    const targetScrollLeft =
      zoomLevel === "detail" || zoomLevel === "focus"
        ? clamp(progressRatio * trackWidth, 0, trackWidth)
        : clamp(
            progressRatio * trackWidth - viewportWidth / 2,
            0,
            Math.max(trackWidth - viewportWidth, 0),
          );

    if (Math.abs(container.scrollLeft - targetScrollLeft) <= 1) {
      return;
    }

    suppressScrollSyncRef.current = true;
    container.scrollLeft = targetScrollLeft;
    setScrollOffset(targetScrollLeft);
    requestAnimationFrame(() => {
      suppressScrollSyncRef.current = false;
    });
  }, [
    currentTime,
    duration,
    progressRatio,
    trackWidth,
    viewportWidth,
    zoomLevel,
  ]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setError("Playback was blocked by the browser.");
      }
      return;
    }

    audio.pause();
  }

  function handleSeek(nextValue: number) {
    const audio = audioRef.current;
    if (!audio || !duration) {
      return;
    }

    const clampedValue = Math.min(duration, Math.max(0, nextValue));
    audio.currentTime = clampedValue;
    setCurrentTime(clampedValue);
  }

  function seekBy(deltaSeconds: number) {
    handleSeek(currentTime + deltaSeconds);
  }

  async function previewPausedNudge() {
    const audio = audioRef.current;
    if (!audio || !audio.paused) {
      return;
    }

    if (nudgePreviewTimeoutRef.current !== null) {
      window.clearTimeout(nudgePreviewTimeoutRef.current);
      nudgePreviewTimeoutRef.current = null;
    }

    try {
      await audio.play();
      nudgePreviewTimeoutRef.current = window.setTimeout(() => {
        audio.pause();
        nudgePreviewTimeoutRef.current = null;
      }, 70);
    } catch {}
  }

  function handlePlayerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!audioUrl) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekBy(event.shiftKey ? -1 : -0.05);
      void previewPausedNudge();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(event.shiftKey ? 1 : 0.05);
      void previewPausedNudge();
      return;
    }

    if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      captureTrimStart();
      return;
    }

    if (event.key.toLowerCase() === "o") {
      event.preventDefault();
      captureTrimEnd();
    }
  }

  function seekFromViewportClientX(clientX: number) {
    const container = containerRef.current;
    if (!container || duration <= 0 || trackWidth <= 0) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const xWithinViewport = clamp(clientX - bounds.left, 0, bounds.width);
    const xWithinTrack =
      zoomLevel === "fit"
        ? (xWithinViewport / Math.max(bounds.width, 1)) * trackWidth
        : zoomLevel === "detail" || zoomLevel === "focus"
          ? container.scrollLeft + xWithinViewport - waveformGutterWidth
          : container.scrollLeft + xWithinViewport;
    const ratio = clamp(xWithinTrack / trackWidth, 0, 1);
    handleSeek(duration * ratio);
  }

  function openReplacePicker() {
    if (replaceState === "uploading" || trimState === "trimming") {
      return;
    }

    setError(null);
    setReplaceMessage(null);
    fileInputRef.current?.click();
  }

  function toggleTrimMode() {
    setTrimModeOpen((current) => {
      const next = !current;
      if (!next) {
        setTrimStart(null);
        setTrimEnd(null);
      }
      return next;
    });
    setError(null);
    setReplaceMessage(null);
  }

  function readAudioDuration(file: File) {
    return new Promise<number>((resolve, reject) => {
      const nextAudio = document.createElement("audio");
      const objectUrl = URL.createObjectURL(file);

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        nextAudio.removeAttribute("src");
        nextAudio.load();
      };

      nextAudio.preload = "metadata";
      nextAudio.onloadedmetadata = () => {
        const nextDuration = Math.max(1, Math.round(nextAudio.duration));
        cleanup();

        if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
          reject(new Error("The selected audio duration could not be read."));
          return;
        }

        resolve(nextDuration);
      };
      nextAudio.onerror = () => {
        cleanup();
        reject(new Error("The selected audio file could not be read."));
      };
      nextAudio.src = objectUrl;
    });
  }

  async function submitReplacementAudio(
    file: File,
    nextDuration: number,
    confirmLargeDifference: boolean,
  ) {
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("durationSeconds", String(nextDuration));
    formData.append(
      "confirmLargeDifference",
      confirmLargeDifference ? "true" : "false",
    );

    const response = await fetch(`/api/admin/kirtans/${kirtanId}/audio`, {
      method: "POST",
      body: formData,
    });
    const json = await response.json();

    if (response.status === 409 && json.requiresConfirmation) {
      const confirmed = window.confirm(
        json.message ??
          "The new file size looks very different from the existing audio file. Continue anyway?",
      );

      if (!confirmed) {
        return;
      }

      await submitReplacementAudio(file, nextDuration, true);
      return;
    }

    if (!response.ok) {
      throw new Error(json.error ?? "Failed to replace audio");
    }

    onAudioReplaced(json.kirtan as AdminKirtanDetail);
    setReplaceMessage(
      typeof json.cleanupWarning === "string" &&
        json.cleanupWarning.trim().length > 0
        ? json.cleanupWarning
        : "Audio replaced.",
    );
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!isAllowedAdminAudioFile(selectedFile)) {
      setError("Please choose a supported audio file.");
      setReplaceMessage(null);
      return;
    }

    if (selectedFile.size > MAX_ADMIN_AUDIO_UPLOAD_BYTES) {
      setError(
        `Audio files must be ${formatBytes(MAX_ADMIN_AUDIO_UPLOAD_BYTES)} or smaller.`,
      );
      setReplaceMessage(null);
      return;
    }

    setReplaceState("uploading");
    setError(null);
    setReplaceMessage(null);

    try {
      const nextDuration = await readAudioDuration(selectedFile);
      await submitReplacementAudio(selectedFile, nextDuration, false);
    } catch (replaceError) {
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : "Failed to replace audio.",
      );
    } finally {
      setReplaceState("idle");
    }
  }

  function captureTrimStart() {
    if (!duration || duration <= 0) {
      return;
    }

    setTrimStart(Math.min(duration, Math.max(0, currentTime)));
    setReplaceMessage(null);
    setError(null);
  }

  function captureTrimEnd() {
    if (!duration || duration <= 0) {
      return;
    }

    setTrimEnd(Math.min(duration, Math.max(0, currentTime)));
    setReplaceMessage(null);
    setError(null);
  }

  function resetTrimSelection() {
    setTrimStart(null);
    setTrimEnd(null);
    setReplaceMessage(null);
    setError(null);
  }

  async function applyTrim() {
    if (!audioUrl || !trimSelectionIsValid) {
      return;
    }

    setTrimState("trimming");
    setError(null);
    setReplaceMessage(null);

    try {
      const response = await fetch(
        `/api/admin/kirtans/${kirtanId}/audio/trim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startSeconds: effectiveTrimStart,
            endSeconds: effectiveTrimEnd,
          }),
        },
      );
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to trim audio");
      }

      onAudioReplaced(json.kirtan as AdminKirtanDetail);
      setReplaceMessage(
        typeof json.cleanupWarning === "string" &&
          json.cleanupWarning.trim().length > 0
          ? json.cleanupWarning
          : `Audio trimmed to ${formatTime(
              Math.max(1, Math.round(effectiveTrimEnd - effectiveTrimStart)),
            )}.`,
      );
      setTrimStart(null);
      setTrimEnd(null);
    } catch (trimError) {
      setError(
        trimError instanceof Error
          ? trimError.message
          : "Failed to trim audio.",
      );
    } finally {
      setTrimState("idle");
    }
  }

  return (
    <div
      className="border-t border-[#ecd8ce] bg-[linear-gradient(180deg,rgba(255,251,248,0.98)_0%,rgba(255,247,243,0.98)_100%)] px-5 py-3"
      tabIndex={0}
      onKeyDown={handlePlayerKeyDown}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ADMIN_AUDIO_ACCEPT}
        onChange={handleFileSelection}
        className="hidden"
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b18472]">
              Audio preview
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[#674b43]">
              {fileName ?? `${title}.audio`}
            </p>
          </div>
          <div className="mt-1 flex shrink-0 flex-wrap items-center gap-2 lg:mt-3 lg:flex-nowrap lg:justify-end">
            <div className="flex overflow-hidden rounded-full border border-[#e6cfc4] bg-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              {(["fit", "focus", "detail"] as const).map((level, index) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setZoomLevel(level)}
                  className={[
                    "relative px-3 py-1.5 text-xs font-semibold transition",
                    index > 0 ? "border-l border-[#ead7cd]" : "",
                    zoomLevel === level
                      ? "bg-[color:var(--theme-player-green-soft)] text-[color:var(--theme-player-green)]"
                      : "bg-transparent text-[#8a6a60] hover:bg-white/80",
                  ].join(" ")}
                >
                  {level === "fit"
                    ? "Fit"
                    : level === "focus"
                      ? "Focus"
                      : "Detail"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={openReplacePicker}
              disabled={
                !audioUrl ||
                replaceState === "uploading" ||
                trimState === "trimming"
              }
              className="rounded-[0.7rem] border border-[#e6cfc4] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#87675d] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {replaceState === "uploading" ? "Replacing..." : "Replace Audio"}
            </button>
            <button
              type="button"
              onClick={toggleTrimMode}
              disabled={
                !audioUrl ||
                replaceState === "uploading" ||
                trimState === "trimming"
              }
              className={[
                "rounded-[0.7rem] border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                trimModeOpen
                  ? "border-[color:var(--theme-player-green)] bg-[color:var(--theme-player-green-soft)] text-[color:var(--theme-player-green)]"
                  : "border-[#e6cfc4] bg-white/90 text-[#87675d] hover:bg-white",
              ].join(" ")}
            >
              {trimModeOpen ? "Close Trim" : "Trim"}
            </button>
            <p className="min-w-[7rem] shrink-0 text-right text-xs font-medium tabular-nums text-[#9a776c]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
        </div>

        <div className="rounded-[var(--theme-radius-card)] border border-[#ead6cd] bg-white/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {audioUrl ? (
            <div className="relative">
              <div
                ref={containerRef}
                onScroll={() => {
                  const container = containerRef.current;
                  if (container) {
                    setScrollOffset(container.scrollLeft);
                  }

                  if (
                    !container ||
                    suppressScrollSyncRef.current ||
                    zoomLevel === "fit" ||
                    duration <= 0 ||
                    trackWidth <= 0
                  ) {
                    return;
                  }

                  const timelineX =
                    zoomLevel === "detail" || zoomLevel === "focus"
                      ? container.scrollLeft
                      : container.scrollLeft + viewportWidth / 2;
                  const ratio = clamp(timelineX / trackWidth, 0, 1);
                  handleSeek(duration * ratio);
                }}
                className={[
                  "relative overflow-x-auto overflow-y-hidden rounded-[calc(var(--theme-radius-card)-6px)] bg-[linear-gradient(180deg,rgba(249,239,233,0.86)_0%,rgba(255,252,249,0.98)_100%)]",
                  zoomLevel === "fit" ? "overflow-x-hidden" : "",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    seekFromViewportClientX(event.clientX);
                  }}
                  disabled={duration <= 0}
                  aria-label="Seek in waveform"
                  className="relative block h-24 min-w-full disabled:cursor-not-allowed"
                  style={{
                    width:
                      zoomLevel === "detail" || zoomLevel === "focus"
                        ? `${Math.max(totalScrollableWidth, viewportWidth)}px`
                        : trackWidth > 0
                          ? `${trackWidth}px`
                          : "100%",
                  }}
                >
                  {trimStartRatio !== null ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-[rgba(84,61,53,0.1)]"
                      style={{
                        width:
                          zoomLevel === "detail" || zoomLevel === "focus"
                            ? `${waveformGutterWidth + trimStartRatio * trackWidth}px`
                            : `${trimStartRatio * 100}%`,
                      }}
                    />
                  ) : null}
                  {trimEndRatio !== null ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 bg-[rgba(84,61,53,0.1)]"
                      style={{
                        width:
                          zoomLevel === "detail" || zoomLevel === "focus"
                            ? `${waveformGutterWidth + (1 - trimEndRatio) * trackWidth}px`
                            : `${(1 - trimEndRatio) * 100}%`,
                      }}
                    />
                  ) : null}
                  {zoomLevel === "fit" ? (
                    <div
                      className="absolute inset-y-0 left-0 bg-[rgba(121,161,79,0.11)]"
                      style={{ width: `${progressRatio * 100}%` }}
                    />
                  ) : null}
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgba(180,146,130,0.13)]" />
                  <div
                    className="relative flex h-full items-center gap-px py-2"
                    style={{
                      paddingLeft:
                        zoomLevel === "detail" || zoomLevel === "focus"
                          ? `${waveformGutterWidth}px`
                          : "0px",
                      paddingRight:
                        zoomLevel === "detail" || zoomLevel === "focus"
                          ? `${waveformGutterWidth}px`
                          : "0px",
                    }}
                  >
                    {displayedPeaks.map((peak, index, peaks) => {
                      return (
                        <span
                          key={`${index}-${peak}`}
                          className={[
                            "block flex-1 rounded-full transition-[height,background-color,opacity]",
                            isWaveformLoading ? "animate-pulse" : "",
                          ].join(" ")}
                          style={{
                            height: `${
                              zoomLevel === "fit"
                                ? Math.max(10, Math.round(peak * 56))
                                : Math.max(12, Math.round(peak * 64))
                            }px`,
                            backgroundColor:
                              zoomLevel === "fit" &&
                              peaks.length > 1 &&
                              index / (peaks.length - 1) <= progressRatio
                                ? "#7c9f4f"
                                : "#1a1a1a",
                            opacity:
                              waveformPeaks.length > 0 || isWaveformLoading
                                ? 0.98
                                : 0.7,
                          }}
                        />
                      );
                    })}
                  </div>
                  {trimStartRatio !== null ? (
                    <div
                      className="pointer-events-none absolute inset-y-2 w-[2px] rounded-full bg-[#8a6a60] shadow-[0_0_0_1px_rgba(255,255,255,0.78)]"
                      style={{
                        left:
                          zoomLevel === "detail" || zoomLevel === "focus"
                            ? `${waveformGutterWidth + trimStartRatio * trackWidth - 1}px`
                            : trackWidth > 0
                              ? `calc(${trimStartRatio * 100}% - 1px)`
                              : "0px",
                      }}
                    />
                  ) : null}
                  {trimStartRatio !== null ? (
                    <span
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-lg font-semibold leading-none text-[#8a6a60]"
                      style={{
                        left:
                          zoomLevel === "detail" || zoomLevel === "focus"
                            ? `${waveformGutterWidth + trimStartRatio * trackWidth - 10}px`
                            : trackWidth > 0
                              ? `calc(${trimStartRatio * 100}% - 10px)`
                              : "0px",
                      }}
                    >
                      [
                    </span>
                  ) : null}
                  {trimEndRatio !== null ? (
                    <div
                      className="pointer-events-none absolute inset-y-2 w-[2px] rounded-full bg-[#8a6a60] shadow-[0_0_0_1px_rgba(255,255,255,0.78)]"
                      style={{
                        left:
                          zoomLevel === "detail" || zoomLevel === "focus"
                            ? `${waveformGutterWidth + trimEndRatio * trackWidth - 1}px`
                            : trackWidth > 0
                              ? `calc(${trimEndRatio * 100}% - 1px)`
                              : "0px",
                      }}
                    />
                  ) : null}
                  {trimEndRatio !== null ? (
                    <span
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-lg font-semibold leading-none text-[#8a6a60]"
                      style={{
                        left:
                          zoomLevel === "detail" || zoomLevel === "focus"
                            ? `${waveformGutterWidth + trimEndRatio * trackWidth + 2}px`
                            : trackWidth > 0
                              ? `calc(${trimEndRatio * 100}% + 2px)`
                              : "2px",
                      }}
                    >
                      ]
                    </span>
                  ) : null}
                </button>
              </div>
              <div
                className="pointer-events-none absolute inset-y-2 w-[2px] rounded-full bg-[#b86161] shadow-[0_0_0_1px_rgba(255,255,255,0.78)]"
                style={{
                  left:
                    zoomLevel === "fit"
                      ? trackWidth > 0
                        ? `calc(${progressRatio * 100}% - 1px)`
                        : "0px"
                      : "calc(50% - 1px)",
                }}
              />
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-[calc(var(--theme-radius-card)-6px)] bg-[linear-gradient(180deg,rgba(249,239,233,0.86)_0%,rgba(255,252,249,0.98)_100%)] px-4 text-sm text-[#8d6b64]">
              No current audio file is attached to this kirtan yet.
            </div>
          )}

          <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium tabular-nums text-[#9a776c]">
            <span>
              {formatTime(zoomLevel === "fit" ? 0 : visibleStartTime)}
            </span>
            <span>
              {formatTime(zoomLevel === "fit" ? duration : visibleEndTime)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => seekBy(-10)}
            disabled={!audioUrl}
            className="rounded-full border border-[#e7d0c6] bg-white/90 px-3 py-2 text-xs font-semibold text-[#87675d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            -10s
          </button>
          <button
            type="button"
            onClick={() => void togglePlayback()}
            disabled={!audioUrl}
            aria-label={
              isPlaying ? "Pause audio preview" : "Play audio preview"
            }
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] text-white shadow-[0_12px_26px_rgba(121,161,79,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-current"
              >
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-current"
              >
                <path d="M8 5.5v13a1 1 0 0 0 1.53.848l10-6.5a1 1 0 0 0 0-1.696l-10-6.5A1 1 0 0 0 8 5.5Z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            disabled={!audioUrl}
            className="rounded-full border border-[#e7d0c6] bg-white/90 px-3 py-2 text-xs font-semibold text-[#87675d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            +10s
          </button>
        </div>

        {trimModeOpen ? (
          <div className="rounded-[var(--theme-radius-card)] border border-[#ead6cd] bg-white/75 px-3 py-3">
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div />
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#87675d]">
                <span className="inline-flex min-w-[6.5rem] justify-end text-right">
                  {trimStart !== null ? `In: ${formatTime(trimStart)}` : ""}
                </span>
                <button
                  type="button"
                  onClick={captureTrimStart}
                  disabled={!audioUrl || trimState === "trimming"}
                  className="w-[5.75rem] rounded-[0.7rem] border border-[#e7d0c6] bg-white/90 px-3 py-2 text-xs font-semibold text-[#87675d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Set In
                </button>
                <button
                  type="button"
                  onClick={captureTrimEnd}
                  disabled={!audioUrl || trimState === "trimming"}
                  className="w-[5.75rem] rounded-[0.7rem] border border-[#e7d0c6] bg-white/90 px-3 py-2 text-xs font-semibold text-[#87675d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Set Out
                </button>
                <span className="inline-flex min-w-[6.75rem] justify-start text-left">
                  {trimEnd !== null ? `Out: ${formatTime(trimEnd)}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-[#87675d]">
                <button
                  type="button"
                  onClick={resetTrimSelection}
                  disabled={
                    trimState === "trimming" ||
                    (trimStart === null && trimEnd === null)
                  }
                  className="rounded-[0.7rem] border border-[#e7d0c6] bg-white/90 px-3 py-2 text-xs font-semibold text-[#87675d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => void applyTrim()}
                  disabled={
                    !audioUrl ||
                    !trimSelectionIsValid ||
                    trimState === "trimming"
                  }
                  className="rounded-[0.7rem] bg-gradient-to-r from-[color:var(--theme-player-green)] to-[color:var(--theme-player-green-mid)] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(121,161,79,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {trimState === "trimming" ? "Applying Trim..." : "Apply"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-[#9a776c]">
              Use left/right arrows for fine nudging. Hold Shift for 1-second
              steps. Press `I` for In and `O` for Out.
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-[#a45e5a]">{error}</p>
        ) : replaceMessage ? (
          <p className="text-sm text-[#8d6b64]">{replaceMessage}</p>
        ) : waveformError ? (
          <p className="text-sm text-[#8d6b64]">{waveformError}</p>
        ) : null}
      </div>
    </div>
  );
}
