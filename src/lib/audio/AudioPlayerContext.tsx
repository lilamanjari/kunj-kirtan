"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePlayback } from "./usePlayback";
import { useQueue } from "./useQueue";
import { KirtanSummary } from "@/types/kirtan";

export type AudioPlayerApi = ReturnType<typeof useAudioPlayerInternal>;

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);
const LAST_PLAYBACK_KEY = "kirtan_last_playback_v1";

function useAudioPlayerInternal() {
  const playback = usePlayback();
  const queueApi = useQueue();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<KirtanSummary[]>([]);
  const lastCurrentRef = useRef<KirtanSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  //Variables used for Continue Playback:
  const pendingSeekRef = useRef<number | null>(null); //Seek to this position once audio metadata has loaded
  const restoringRef = useRef(false); //Used to make sure we don't accidentally overwrite the stored position while seeking
  const lastSavedRef = useRef(0); //Throttle writing to localStorage
  const restoredRef = useRef(false); //Used to make sure we restore only once per session

  // Initialize a single shared audio element and wire basic listeners.
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      if (pendingSeekRef.current !== null && audio.duration) {
        const target = Math.min(
          audio.duration,
          Math.max(0, pendingSeekRef.current),
        );
        audio.currentTime = target;
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(audio.currentTime);
        pendingSeekRef.current = null;
        restoringRef.current = false;
      }
    };
    const onEnded = () => {
      const next = queueApi.dequeue();
      if (next) {
        playback.play(next);
        return;
      }
      playback.onEnded?.();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audioRef.current = null;
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Restore the last playback position once per session (after queue loads).
  useEffect(() => {
    if (restoredRef.current) return;
    if (typeof window === "undefined") return;
    if (!queueApi.loaded) return;

    const raw = window.localStorage.getItem(LAST_PLAYBACK_KEY);
    if (!raw) {
      restoredRef.current = true;
      return;
    }

    try {
      const saved = JSON.parse(raw) as {
        kirtan?: KirtanSummary;
        time?: number;
        duration?: number;
      };
      const savedKirtan = saved.kirtan;
      const savedTime = Number(saved.time ?? 0);
      const savedDuration = Number(saved.duration ?? 0);
      const hasQueue = queueApi.queue.length > 0;
      const timeOk = savedTime > 10;
      const remainingOk =
        !Number.isFinite(savedDuration) ||
        savedDuration <= 0 ||
        savedDuration - savedTime > 10;

      if (savedKirtan && (hasQueue || (timeOk && remainingOk))) {
        playback.select(savedKirtan);
        if (Number.isFinite(savedTime) && savedTime > 0) {
          pendingSeekRef.current = savedTime;
          restoringRef.current = true;
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      restoredRef.current = true;
    }
  }, [queueApi.queue.length, queueApi.loaded]);

  // Persist playback position, throttled, avoiding writes during restore.
  useEffect(() => {
    if (!playback.current) return;
    if (typeof window === "undefined") return;
    if (restoringRef.current) return;
    const now = Date.now();
    if (now - lastSavedRef.current < 2000) return;
    if (playback.state === "paused" && currentTime === 0) return;

    const payload = {
      kirtan: playback.current,
      time: currentTime,
      duration: duration || undefined,
    };

    try {
      window.localStorage.setItem(LAST_PLAYBACK_KEY, JSON.stringify(payload));
      lastSavedRef.current = now;
    } catch {
      // ignore storage failures
    }
  }, [currentTime, duration, playback.current?.id]);

  // Sync playback state to the underlying audio element.
  useEffect(() => {
    console.log("effect", playback.state, playback.current);
    const audio = audioRef.current;
    if (!audio || !playback.current) return;

    if ("mediaSession" in navigator) {
      const origin = window.location.origin;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: playback.current.title || "Kunj Kirtan",
        artist: playback.current.lead_singer ?? "Kunj Kirtan",
        album: "Kunj Kirtan",
        artwork: [
          {
            src: `${origin}/kirtan-icon.svg`,
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      });
    }

    if (audio.src !== playback.current.audio_url) {
      audio.src = playback.current.audio_url;
      audio.currentTime = 0;
    }

    if (playback.state === "loading") {
      audio
        .play()
        .then(() => {
          playback.setState("playing");
        })
        .catch(() => {
          playback.setState("paused");
        });

      return;
    }

    if (playback.state === "playing") {
      audio.play().catch(() => {});
      return;
    }

    if (playback.state === "paused") {
      audio.pause();
    }
  }, [playback.state, playback.current?.id]);

  // Track playback history for the "previous" button.
  useEffect(() => {
    const current = playback.current;
    const last = lastCurrentRef.current;

    if (current && last && current.id !== last.id) {
      historyRef.current = [last, ...historyRef.current].slice(0, 20);
    }

    lastCurrentRef.current = current ?? null;
  }, [playback.current?.id]);

  const seekBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime += seconds;
    setProgress(audio.currentTime / audio.duration);
  };

  const seekTo = (fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const clamped = Math.min(1, Math.max(0, fraction));
    audio.currentTime = audio.duration * clamped;
    setProgress(clamped);
  };

  const playNext = () => {
    const next = queueApi.dequeue();
    if (next) {
      playback.play(next);
    }
  };

  const playPrev = () => {
    const previous = historyRef.current[0];
    if (previous) {
      historyRef.current = historyRef.current.slice(1);
      playback.play(previous);
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setProgress(0);
      setCurrentTime(0);
    }
  };

  return {
    ...playback,
    progress,
    duration,
    currentTime,
    seekBy,
    seekTo,
    playNext,
    playPrev,
    queue: queueApi.queue,
    enqueue: queueApi.enqueue,
    clearQueue: queueApi.clearQueue,
    queueNotice: queueApi.notice,
    isQueued: queueApi.isQueued,
  };
}

export function AudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const api = useAudioPlayerInternal();

  return (
    <AudioPlayerContext.Provider value={api}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return ctx;
}
