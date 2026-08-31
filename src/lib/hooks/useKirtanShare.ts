"use client";

import { useCallback } from "react";
import type { KirtanSummary } from "@/types/kirtan";
import { buildLocalizedKirtanDetailPath } from "@/lib/kirtanDetailHref";
import { useDictionary, useLocale } from "@/lib/i18n/LocaleProvider";

export function useKirtanShare() {
  const dictionary = useDictionary();
  const locale = useLocale();

  return useCallback(
    async (kirtan: KirtanSummary) => {
      const url = `${window.location.origin}${buildLocalizedKirtanDetailPath(locale, kirtan)}`;

      let copied = false;

      const shareData = {
        url: url,
      };
      const tryClipboardFallback = async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            copied = true;
            return true;
          }
        } catch {
          copied = false;
        }
        return false;
      };

      if (navigator.share) {
        try {
          if (!navigator.canShare || navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else {
            throw new Error("Native share data not supported");
          }
        } catch (error) {
          const name =
            error instanceof DOMException
              ? error.name
              : error instanceof Error
                ? error.name
                : "";
          if (name === "AbortError") {
            return { url, copied: false };
          }

          if (navigator.share) {
            try {
              if (!navigator.canShare || navigator.canShare(shareData)) {
                await navigator.share(shareData);
                return { url, copied: false };
              }
            } catch (retryError) {
              const retryName =
                retryError instanceof DOMException
                  ? retryError.name
                  : retryError instanceof Error
                    ? retryError.name
                    : "";
              if (retryName === "AbortError") {
                return { url, copied: false };
              }
            }
          }

          const copiedFallback = await tryClipboardFallback();
          if (!copiedFallback) {
            window.prompt(dictionary.player.copyLinkPrompt, url);
          }
        }
      } else {
        const copiedFallback = await tryClipboardFallback();
        if (!copiedFallback) {
          window.prompt(dictionary.player.copyLinkPrompt, url);
        }
      }

      return { url, copied };
    },
    [
      dictionary.player.copyLinkPrompt,
      locale,
    ],
  );
}
