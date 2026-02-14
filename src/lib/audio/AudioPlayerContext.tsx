"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePlayback } from "./usePlayback";
import { useQueue } from "./useQueue";

export type AudioPlayerApi = ReturnType<typeof useAudioPlayerInternal>;

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

function useAudioPlayerInternal() {
  const playback = usePlayback();
  const queueApi = useQueue();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<KirtanSummary[]>([]);
  const lastCurrentRef = useRef<KirtanSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

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
