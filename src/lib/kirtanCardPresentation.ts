import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { KirtanSummary } from "@/types/kirtan";

type KirtanListDisplayProps = {
  titleOverride: string;
  subtitleOverride: string;
  useShortDate: true;
  stackActionsOnMobile: true;
};

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

export function getBhajanItemDisplayProps(
  kirtan: KirtanSummary,
): KirtanListDisplayProps {
  const text = getKirtanCardText(kirtan);

  return {
    titleOverride: text.title,
    subtitleOverride: text.subtitle,
    useShortDate: true,
    stackActionsOnMobile: true,
  };
}

export function getMahaMantraItemDisplayProps(
  kirtan: KirtanSummary,
): KirtanListDisplayProps {
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);

  return {
    titleOverride: kirtan.lead_singer ?? displayTitle,
    subtitleOverride: `${displayTitle}${kirtan.sequence_num ? ` #${kirtan.sequence_num}` : ""}`,
    useShortDate: true,
    stackActionsOnMobile: true,
  };
}

export function getMixedListItemDisplayProps(
  kirtan: KirtanSummary,
): KirtanListDisplayProps {
  return kirtan.type === "MM"
    ? getMahaMantraItemDisplayProps(kirtan)
    : getBhajanItemDisplayProps(kirtan);
}

export function getLeadPageItemDisplayProps(
  kirtan: KirtanSummary,
  options: {
    isOtherLeadView: boolean;
    activeType: "MM" | "BHJ" | "HK" | null;
  },
): KirtanListDisplayProps {
  const displayTitle = formatKirtanTitle(kirtan.type, kirtan.title);
  const titleWithSequence = kirtan.sequence_num
    ? `${displayTitle} #${kirtan.sequence_num}`
    : displayTitle;

  if (!options.isOtherLeadView) {
    return {
      titleOverride: titleWithSequence,
      subtitleOverride: "",
      useShortDate: true,
      stackActionsOnMobile: true,
    };
  }

  if (options.activeType === "MM") {
    return {
      titleOverride: kirtan.lead_singer ?? titleWithSequence,
      subtitleOverride: titleWithSequence,
      useShortDate: true,
      stackActionsOnMobile: true,
    };
  }

  return {
    titleOverride: titleWithSequence,
    subtitleOverride: kirtan.lead_singer ?? "",
    useShortDate: true,
    stackActionsOnMobile: true,
  };
}
