"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePlayback } from "./usePlayback";
import type { KirtanSummary } from "@/types/kirtan";

export type AudioPlayerApi = ReturnType<typeof useAudioPlayerInternal>;

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

function useAudioPlayerInternal() {
  const playback = usePlayback();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [queue, setQueue] = useState<KirtanSummary[]>([]);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const queueRef = useRef<KirtanSummary[]>([]);

  const QUEUE_STORAGE_KEY = "kirtan_queue_v1";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setQueue(parsed);
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setQueueLoaded(true);
    }
  }, []);

  useEffect(() => {
    queueRef.current = queue;
    if (!queueLoaded) return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch {
      // ignore storage failures
    }
  }, [queue, queueLoaded]);

  function enqueue(kirtan: KirtanSummary) {
    setQueue((prev) => [...prev, kirtan]);
    setQueueNotice(`Added "${kirtan.title}" to queue`);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20);
    }
  }

  function dequeue() {
    setQueue((prev) => prev.slice(1));
  }

  function clearQueue() {
    setQueue([]);
  }

  useEffect(() => {
    if (!queueNotice) return;
    const timer = setTimeout(() => setQueueNotice(null), 1500);
    return () => clearTimeout(timer);
  }, [queueNotice]);

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
    };
    const onEnded = () => {
      const next = queueRef.current[0];
      if (next) {
        dequeue();
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

  // sync playback → audio
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

    if (playback.state === "loading") {
      audio.src = playback.current.audio_url;
      audio.currentTime = 0;

      audio
        .play()
        .then(() => playback.setState("playing"))
        .catch(() => playback.setState("paused"));

      return;
    }

    if (playback.state === "playing") {
      audio.play();
      return;
    }

    if (playback.state === "paused") {
      audio.pause();
    }
  }, [playback.state, playback.current?.id]);

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

  return {
    ...playback,
    progress,
    duration,
    currentTime,
    seekBy,
    seekTo,
    queue,
    enqueue,
    clearQueue,
    queueNotice,
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
