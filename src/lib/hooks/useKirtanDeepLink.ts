"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { KirtanSummary } from "@/types/kirtan";

type UseKirtanDeepLinkOptions = {
  kirtans: KirtanSummary[];
  onSelect: (kirtan: KirtanSummary) => void;
  isActive?: (kirtan: KirtanSummary) => boolean;
  onPin?: (kirtan: KirtanSummary) => void;
};

export function useKirtanDeepLink({
  kirtans,
  onSelect,
  isActive,
  onPin,
}: UseKirtanDeepLinkOptions) {
  const searchParams = useSearchParams();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("kirtan");
    if (!id) return;
    if (handledRef.current === id) return;

    const existing = kirtans.find((k) => k.id === id);
    if (existing) {
      onPin?.(existing);
      if (!isActive || !isActive(existing)) {
        onSelect(existing);
      }
      handledRef.current = id;
      return;
    }

    let canceled = false;

    fetch(`/api/kirtans/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Kirtan not found");
        }
        return res.json();
      })
      .then((json) => {
        if (canceled) return;
        const kirtan = json.kirtan as KirtanSummary | null;
        if (kirtan) {
          onPin?.(kirtan);
          onSelect(kirtan);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!canceled) {
          handledRef.current = id;
        }
      });

    return () => {
      canceled = true;
    };
  }, [kirtans, onSelect, isActive, searchParams, onPin]);
}
