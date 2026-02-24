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
  const isReady = useSyncExternalStore(subscribe, getSnapshot, () => false);
  if (!isReady) return null;
  return <AudioPlayerBar />;
}
