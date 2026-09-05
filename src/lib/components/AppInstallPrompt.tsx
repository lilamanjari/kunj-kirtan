"use client";

import { useEffect, useState } from "react";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

const INSTALL_PROMPT_DISMISSED_KEY = "kirtan_app_install_prompt_dismissed_v1";
const IOS_INSTALL_STEPS = [
  "/ios-share-step1.jpg",
  "/ios-share-step2.jpg",
  "/ios-share-step3.jpg",
  "/ios-share-step4.jpg",
];

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIOSSafari() {
  const { userAgent } = navigator;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isOtherIOSBrowser = /CriOS|FxiOS|OPiOS|EdgiOS/.test(userAgent);

  return isIOS && !isOtherIOSBrowser;
}

export default function AppInstallPrompt() {
  const { install: installCopy, actions } = useDictionary();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [iosStep, setIOSStep] = useState<number | null>(null);

  useEffect(() => {
    if (
      window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) ||
      isInstalled() ||
      !window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    if (isIOSSafari()) {
      setShowPrompt(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
    setShowPrompt(false);
    setShowIOSInstructions(false);
    setIOSStep(null);
  };

  const install = async () => {
    if (isIOSSafari()) {
      window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    // A user who chooses OK should not be prompted again, even if they dismiss
    // the browser's native install dialog.
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
    setShowPrompt(false);
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(71,47,37,0.32)] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-sm sm:items-center sm:pb-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-install-title"
    >
      <section className="w-full max-w-sm rounded-[1.4rem] border border-[#ead9ce] bg-[linear-gradient(145deg,#fffdf9_0%,#fdf5ed_100%)] p-6 text-center shadow-[0_24px_64px_rgba(97,65,48,0.28)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf0e1] shadow-[inset_0_0_0_1px_rgba(109,139,91,0.2)]">
          <img src="/kirtan-icon.svg" alt="" className="h-9 w-9" />
        </div>
        <h2 id="app-install-title" className="font-display text-2xl font-semibold text-[#54382e]">
          {installCopy.prompt}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#876d60]">{installCopy.description}</p>
        {showIOSInstructions && iosStep === null && (
          <p className="mt-4 rounded-xl bg-[#f4eadf] px-4 py-3 text-sm font-medium leading-5 text-[#675046]">
            {installCopy.iosInstructions}
          </p>
        )}
        {iosStep !== null && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#ead9ce] bg-[#f5eee7]">
            <img
              src={IOS_INSTALL_STEPS[iosStep]}
              alt={installCopy.stepOf
                .replace("{current}", String(iosStep + 1))
                .replace("{total}", String(IOS_INSTALL_STEPS.length))}
              className="max-h-[48vh] w-full object-contain"
            />
            <p className="border-t border-[#ead9ce] px-3 py-2 text-xs font-semibold text-[#80665a]">
              {installCopy.stepOf
                .replace("{current}", String(iosStep + 1))
                .replace("{total}", String(IOS_INSTALL_STEPS.length))}
            </p>
          </div>
        )}
        {showIOSInstructions ? (
          <div className="mt-6 space-y-3">
            {iosStep === null ? (
              <button
                type="button"
                onClick={() => setIOSStep(0)}
                className="w-full rounded-xl bg-[#617c52] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(82,112,67,0.24)] transition hover:bg-[#506a45]"
              >
                {installCopy.showHow}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIOSStep((step) => Math.max(0, (step ?? 0) - 1))}
                  disabled={iosStep === 0}
                  className="rounded-xl border border-[#e5d4c9] bg-white px-4 py-3 text-sm font-semibold text-[#80665a] transition hover:bg-[#fff8f2] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {installCopy.previousStep}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setIOSStep((step) =>
                      Math.min(IOS_INSTALL_STEPS.length - 1, (step ?? 0) + 1),
                    )
                  }
                  disabled={iosStep === IOS_INSTALL_STEPS.length - 1}
                  className="rounded-xl bg-[#617c52] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(82,112,67,0.24)] transition hover:bg-[#506a45] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {installCopy.nextStep}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-xl border border-[#e5d4c9] bg-white px-4 py-3 text-sm font-semibold text-[#80665a] transition hover:bg-[#fff8f2]"
            >
              {actions.dismiss}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-[#e5d4c9] bg-white px-4 py-3 text-sm font-semibold text-[#80665a] transition hover:bg-[#fff8f2]"
            >
              {installCopy.cancel}
            </button>
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-xl bg-[#617c52] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(82,112,67,0.24)] transition hover:bg-[#506a45]"
            >
              {installCopy.confirm}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
