"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";

export default function QueueToast() {
  const { queueNotice } = useAudioPlayer();

  if (!queueNotice) return null;

  return (
    <div className="pointer-events-none fixed bottom-[calc(8rem+env(safe-area-inset-bottom))] left-0 right-0 z-[60]">
      <div className="mx-auto max-w-md px-4">
        <div className="animate-toast-in rounded-lg bg-[#fff5f2] px-3 py-2 text-xs text-[#9b5c56] shadow-sm">
          {queueNotice}
        </div>
      </div>
    </div>
  );
}
