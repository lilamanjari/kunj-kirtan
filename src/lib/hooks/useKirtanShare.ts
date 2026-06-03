"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { KirtanSummary } from "@/types/kirtan";
import { formatKirtanTitle } from "@/lib/kirtanTitle";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

export function useKirtanShare() {
  const dictionary = useDictionary();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    async (kirtan: KirtanSummary) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("kirtan", kirtan.id);
      const url = `${window.location.origin}${pathname}?${params.toString()}`;

      let copied = false;

      const title = formatKirtanTitle(kirtan.type, kirtan.title);
      const singer = kirtan.lead_singer ? ` by ${kirtan.lead_singer}` : "";
      const shareText = `${dictionary.player.checkOutKirtan} ${title || "this kirtan"}${singer} ${dictionary.player.onKunjKirtan}:\n${url}`;

      const shareData = {
        title: title || "Kunj Kirtan",
        text: shareText,
        url: url,
      };
      const fallbackShareData = {
        title: title || "Kunj Kirtan",
        url: url,
      };
      const tryClipboardFallback = async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareText);
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
          } else if (!navigator.canShare || navigator.canShare(fallbackShareData)) {
            await navigator.share(fallbackShareData);
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
              if (!navigator.canShare || navigator.canShare(fallbackShareData)) {
                await navigator.share(fallbackShareData);
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
      dictionary.player.checkOutKirtan,
      dictionary.player.onKunjKirtan,
      dictionary.player.copyLinkPrompt,
      pathname,
      searchParams,
    ],
  );
}
