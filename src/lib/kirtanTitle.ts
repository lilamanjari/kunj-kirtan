import type { KirtanType } from "@/types/kirtan";

export function formatKirtanTitle(type: KirtanType, title: string | null | undefined) {
  const cleanTitle = title?.trim() ?? "";

  if (type !== "MM") {
    return cleanTitle;
  }

  if (!cleanTitle) {
    return "Maha Mantra";
  }

  if (cleanTitle.toLowerCase() === "maha mantra") {
    return "Maha Mantra";
  }

  if (cleanTitle.toLowerCase().startsWith("maha mantra ")) {
    return cleanTitle;
  }

  return `Maha Mantra ${cleanTitle}`;
}
