"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePlayback } from "./usePlayback";

export type AudioPlayerApi = ReturnType<typeof useAudioPlayerInternal>;

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

function useAudioPlayerInternal() {
  const playback = usePlayback();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
    };

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => playback.onEnded?.();

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

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime += seconds;
    setProgress(audio.currentTime / audio.duration);
  };

  return { ...playback, progress, duration, seek };
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
