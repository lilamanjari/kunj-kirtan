"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePlayback } from "./usePlayback";
import { useQueue } from "./useQueue";
import { KirtanSummary } from "@/types/kirtan";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { markOffline, recordRequestSuccess } from "@/lib/net/offlineStore";

export type AudioPlayerApi = ReturnType<typeof useAudioPlayerInternal>;

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);
const LAST_PLAYBACK_KEY = "kirtan_last_playback_v1";
const CLIENT_ID_KEY = "kirtan_client_id_v1";
const SESSION_ID_KEY = "kirtan_session_id_v1";

function getOrCreateStorageId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

function useAudioPlayerInternal() {
  const playback = usePlayback();
  const queueApi = useQueue();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<KirtanSummary[]>([]);
  const lastCurrentRef = useRef<KirtanSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  //Variables used for Continue Playback:
  const pendingSeekRef = useRef<number | null>(null); //Seek to this position once audio metadata has loaded
  const restoringRef = useRef(false); //Used to make sure we don't accidentally overwrite the stored position while seeking
  const lastSavedRef = useRef(0); //Throttle writing to localStorage
  const restoredRef = useRef(false); //Used to make sure we restore only once per session
  const trackedPlayRef = useRef<{ kirtanId: string | null; sent: boolean }>({
    kirtanId: null,
    sent: false,
  });
  const [playToken, setPlayToken] = useState<{
    kirtanId: string | null;
    token: string | null;
  }>({
    kirtanId: null,
    token: null,
  });

  // Initialize a single shared audio element and wire basic listeners.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      setIsBuffering(false);
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
    const onLoadStart = () => setIsBuffering(true);
    const onWaiting = () => setIsBuffering(true);
    const onStalled = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      recordRequestSuccess();
    };
    const onCanPlay = () => setIsBuffering(false);
    const onError = () => {
      setIsBuffering(false);
      markOffline();
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
    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audioRef.current = null;
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
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

  // Fetch a short-lived signed token for the current kirtan before logging playback.
  useEffect(() => {
    const current = playback.current;
    if (!current) {
      setPlayToken({ kirtanId: null, token: null });
      return;
    }

    const controller = new AbortController();
    setPlayToken({ kirtanId: current.id, token: null });

    fetch(`/api/plays/token?kirtan_id=${encodeURIComponent(current.id)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = await res.json();
        return typeof json.token === "string" ? json.token : null;
      })
      .then((token) => {
        if (!controller.signal.aborted) {
          setPlayToken({ kirtanId: current.id, token });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPlayToken({ kirtanId: current.id, token: null });
        }
      });

    return () => controller.abort();
  }, [playback.current?.id]);

  // Record one qualified play per playback session once the listener reaches 15 seconds.
  useEffect(() => {
    const current = playback.current;
    if (!current) return;
    if (playback.state !== "playing") return;
    if (currentTime < 15) return;
    if (playToken.kirtanId !== current.id || !playToken.token) return;

    if (trackedPlayRef.current.kirtanId !== current.id) {
      trackedPlayRef.current = { kirtanId: current.id, sent: false };
    }

    if (trackedPlayRef.current.sent) return;
    trackedPlayRef.current.sent = true;

    try {
      const clientId = window.localStorage
        ? getOrCreateStorageId(window.localStorage, CLIENT_ID_KEY)
        : null;
      const sessionId = window.sessionStorage
        ? getOrCreateStorageId(window.sessionStorage, SESSION_ID_KEY)
        : null;

      fetch("/api/plays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kirtan_id: current.id,
          seconds_played: Math.max(15, Math.round(currentTime)),
          client_id: clientId,
          session_id: sessionId,
          token: playToken.token,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore analytics failures
    }
  }, [currentTime, playback.current?.id, playback.state, playToken]);

  // Sync playback state to the underlying audio element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playback.current) return;

    if ("mediaSession" in navigator) {
      const origin = window.location.origin;
      const sequenceLabel = playback.current.sequence_num
        ? `#${playback.current.sequence_num}`
        : "";
      const mediaTitle =
        formatKirtanTitle(playback.current.type, playback.current.title) ||
        "Kunj Kirtan";
      const mediaArtist = sequenceLabel
        ? `${sequenceLabel} by ${playback.current.lead_singer ?? "Kunj Kirtan"}`
        : (playback.current.lead_singer ?? "Kunj Kirtan");
      navigator.mediaSession.metadata = new MediaMetadata({
        title: mediaTitle,
        artist: mediaArtist,
        album: "Kunj Kirtan",
        artwork: [
          {
            src: `${origin}/og-kunj-kirtan.jpg`,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });
    }

    if (audio.src !== playback.current.audio_url) {
      audio.src = playback.current.audio_url;
      audio.currentTime = 0;
      audio.load();
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
      setIsBuffering(false);
    }
  }, [playback.state, playback.current?.id]);

  useEffect(() => {
    if (trackedPlayRef.current.kirtanId !== playback.current?.id) {
      trackedPlayRef.current = {
        kirtanId: playback.current?.id ?? null,
        sent: false,
      };
    }
  }, [playback.current?.id]);

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
    isBuffering,
    seekBy,
    seekTo,
    playNext,
    playPrev,
    queue: queueApi.queue,
    enqueue: queueApi.enqueue,
    dequeueById: queueApi.dequeueById,
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
