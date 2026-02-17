"use client";

import { useState } from "react";
import { KirtanSummary } from "@/types/kirtan";

export function usePlayback() {
  const [current, setCurrent] = useState<KirtanSummary | null>(null);
  const [state, setState] = useState<"paused" | "playing" | "loading">(
    "paused",
  );

  function isActive(kirtan: KirtanSummary) {
    return current?.id === kirtan.id;
  }

  function isPlaying() {
    return state === "playing";
  }

  function isLoading() {
    return state === "loading";
  }

  function play(kirtan: KirtanSummary) {
    // new kirtan → load & play
    if (!current || current.id !== kirtan.id) {
      setCurrent(kirtan);
      setState("loading");
      return;
    }

    // same kirtan, paused → resume
    if (state === "paused") {
      setState("playing");
    }

    // same kirtan, already playing → no-op
  }

  function select(kirtan: KirtanSummary) {
    setCurrent(kirtan);
    setState("paused");
  }

  function pause() {
    if (!current) return;
    setState("paused");
  }

  const onEnded = () => {
    setState("paused");
    setCurrent(null);
  };

  function toggle(kirtan: KirtanSummary) {
    if (!isActive(kirtan)) {
      play(kirtan);
      return;
    }
    if (state === "playing") {
      pause();
    } else {
      setState("playing");
    }
  }

  return {
    current,
    state,
    isLoading,
    isActive,
    isPlaying,
    setState,
    play,
    select,
    pause,
    toggle,
    onEnded,
  };
}
