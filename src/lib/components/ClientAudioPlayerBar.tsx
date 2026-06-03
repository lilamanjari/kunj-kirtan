"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import AudioPlayerBar from "@/lib/components/AudioPlayerBar";

export default function ClientAudioPlayerBar() {
  const { current } = useAudioPlayer();
  if (!current) return null;

  return (
    <>
      <div aria-hidden="true" className="h-24" />
      <AudioPlayerBar />
    </>
  );
}
