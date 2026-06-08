"use client";

import { useDictionary } from "@/lib/i18n/LocaleProvider";

type AlphabetRailProps = {
  letters: string[];
  availableLetters: Set<string>;
  onSelectLetter: (letter: string) => void;
  currentLetter?: string | null;
  pendingLetter?: string | null;
  onReset?: (() => void) | null;
  visible?: boolean;
};

export default function AlphabetRail({
  letters,
  availableLetters,
  onSelectLetter,
  currentLetter = null,
  pendingLetter = null,
  onReset = null,
  visible = true,
}: AlphabetRailProps) {
  const dictionary = useDictionary();

  function stopRailTap(event: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      className={`fixed right-2 top-1/2 z-30 -translate-y-1/2 touch-none transition-opacity duration-300 sm:right-4 ${
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="rounded-full border border-white/75 bg-white/82 px-1.5 py-2 shadow-md backdrop-blur-sm">
        <div className="flex flex-col items-center gap-0.5">
          {onReset ? (
            <button
              type="button"
              onPointerDown={stopRailTap}
              onClick={(event) => {
                stopRailTap(event);
                onReset();
              }}
              className="mb-1 flex h-6 w-6 items-center justify-center rounded-full font-[family:var(--font-inter)] text-[0.62rem] font-semibold leading-none text-[#9b6a5f] transition hover:bg-[#f7e7df] hover:text-[#7f5146]"
              aria-label={dictionary.actions.backToTop}
              title={dictionary.actions.backToTop}
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
                <path
                  d="M4 4.5h8M8 12V5.75M5.5 8.25 8 5.75l2.5 2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
          {letters.map((letter) => {
            const isAvailable = availableLetters.has(letter);
            const isCurrent = currentLetter === letter;
            const isPending = pendingLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                onPointerDown={stopRailTap}
                onClick={(event) => {
                  stopRailTap(event);
                  onSelectLetter(letter);
                }}
                disabled={!isAvailable}
                className={`relative flex h-5 w-5 items-center justify-center rounded-full font-[family:var(--font-inter)] text-[0.58rem] font-semibold leading-none transition ${
                  isAvailable
                    ? isPending
                      ? "bg-[#ead5db] text-[#7f5146] shadow-sm"
                      : isCurrent
                      ? "bg-[#9b6a5f] text-white shadow-sm"
                      : "text-[#9b6a5f] hover:bg-[#f7e7df] hover:text-[#7f5146]"
                    : "cursor-default text-stone-300"
                }`}
                aria-label={`${dictionary.actions.jumpToLetter} ${letter}`}
                aria-pressed={isCurrent || isPending}
              >
                {letter}
                {isPending ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#9b6a5f] animate-pulse"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
