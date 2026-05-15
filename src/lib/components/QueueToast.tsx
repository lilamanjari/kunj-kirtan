"use client";

import { useAudioPlayer } from "@/lib/audio/AudioPlayerContext";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

export default function QueueToast() {
  const dictionary = useDictionary();
  const { queueNotice } = useAudioPlayer();

  if (!queueNotice) return null;

  const message =
    queueNotice.kind === "added"
      ? dictionary.player.addedToQueue.replace("{title}", queueNotice.title)
      : dictionary.player.removedFromQueue.replace(
          "{title}",
          queueNotice.title,
        );

  return (
    <div className="pointer-events-none fixed bottom-[calc(8rem+env(safe-area-inset-bottom))] left-0 right-0 z-[60]">
      <div className="mx-auto max-w-md px-4">
        <div className="animate-toast-in rounded-lg bg-[#fff5f2] px-3 py-2 text-xs text-[#9b5c56] shadow-sm">
          {message}
        </div>
      </div>
    </div>
  );
}
