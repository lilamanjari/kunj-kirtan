import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { KirtanSummary } from "@/types/kirtan";

export function getKirtanCardText(kirtan: KirtanSummary) {
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);

  if (kirtan.type === "MM") {
    return {
      title: kirtan.lead_singer ?? displayTitle,
      subtitle: `${displayTitle}${kirtan.sequence_num ? ` #${kirtan.sequence_num}` : ""}`,
    };
  }

  return {
    title: displayTitle,
    subtitle: kirtan.lead_singer ?? "",
  };
}
