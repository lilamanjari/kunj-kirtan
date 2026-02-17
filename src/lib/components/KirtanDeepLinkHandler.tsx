"use client";

import { useKirtanDeepLink } from "@/lib/hooks/useKirtanDeepLink";
import type { KirtanSummary } from "@/types/kirtan";

type KirtanDeepLinkHandlerProps = {
  kirtans: KirtanSummary[];
  onSelect: (kirtan: KirtanSummary) => void;
  isActive?: (kirtan: KirtanSummary) => boolean;
  onPin: (kirtan: KirtanSummary) => void;
};

export default function KirtanDeepLinkHandler({
  kirtans,
  onSelect,
  isActive,
  onPin,
}: KirtanDeepLinkHandlerProps) {
  useKirtanDeepLink({ kirtans, onSelect, isActive, onPin });
  return null;
}
