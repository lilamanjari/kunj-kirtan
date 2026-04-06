"use client";

import { useSyncExternalStore } from "react";
import AudioPlayerBar from "@/lib/components/AudioPlayerBar";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("load", callback, { once: true });
  return () => window.removeEventListener("load", callback);
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return document.readyState === "complete";
}

export default function ClientAudioPlayerBar() {
  // The player depends on browser-only APIs such as Audio, localStorage,
  // and Media Session, so we wait until the window has fully loaded before
  // mounting it to avoid hydration and SSR/client timing issues.
  const isReady = useSyncExternalStore(subscribe, getSnapshot, () => false);
  if (!isReady) return null;
  return <AudioPlayerBar />;
}
