"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { KirtanSummary } from "@/types/kirtan";

export function useKirtanShare() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    async (kirtan: KirtanSummary) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("kirtan", kirtan.id);
      const url = `${window.location.origin}${pathname}?${params.toString()}`;

      let copied = false;

      const shareData = {
        title: document.title,
        text: "Here's a song for you!",
        url: url,
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          console.log("Successful share");
        } catch (err) {
          console.error("Error sharing:", err);
        }
      } else {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
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
