"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { KirtanSummary } from "@/types/kirtan";
import { formatKirtanTitle } from "@/lib/kirtanTitle";

export function useKirtanShare() {
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
      const shareText = `Check out ${title || "this kirtan"}${singer} on Kunj Kirtan:\n${url}`;

      const shareData = {
        title: title || "Kunj Kirtan",
        text: shareText,
        url: url,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch {
          // Ignore cancelled shares and fall back only when needed.
        }
      } else {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareText);
            copied = true;
          }
        } catch {
          copied = false;
        }
      }

      return { url, copied };
    },
    [pathname, searchParams],
  );
}
