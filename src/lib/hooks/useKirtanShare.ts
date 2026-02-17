"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { KirtanSummary } from "@/types/kirtan";

export function useKirtanShare() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const copyToClipboard = (text: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  return useCallback(
    async (kirtan: KirtanSummary) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("kirtan", kirtan.id);
      const url = `${window.location.origin}${pathname}?${params.toString()}`;

      let copied = false;
      try {
        copied = copyToClipboard(url);
      } catch {
        copied = false;
      }

      if (!copied) {
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
