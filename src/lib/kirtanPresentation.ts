import type { KirtanSummary } from "@/types/kirtan";

type RailCardPalette = {
  borderTint: string;
  topGlow: string;
  bottomTint: string;
  midGlow: string;
};

export function formatKirtanDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "";
  }

  const total = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0",
    )}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function getKirtanSequenceLabel(sequenceNum?: number | null) {
  return sequenceNum ? `#${sequenceNum}` : null;
}

export function hashHue(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  return hash;
}

export function getKirtanTintHue(kirtan: Pick<KirtanSummary, "id" | "type">) {
  const baseHue = hashHue(kirtan.id);
  return kirtan.type === "BHJ" ? (baseHue + 340) % 360 : baseHue;
}

export function getRailCardPalette(
  kirtan: Pick<KirtanSummary, "id" | "type" | "is_rare_gem">,
  opacity = 0.9,
): RailCardPalette {
  if (kirtan.is_rare_gem) {
    return {
      borderTint: "rgba(251, 191, 36, 0.65)",
      topGlow: `rgba(255, 251, 242, ${opacity})`,
      bottomTint: `rgba(255, 252, 246, ${opacity})`,
      midGlow: `rgba(255,255,255,${opacity})`,
    };
  }

  const tintHue = getKirtanTintHue(kirtan);

  return {
    borderTint: `hsla(${tintHue}, 72%, 82%, 1)`,
    topGlow: `hsla(${tintHue}, 70%, 98%, ${opacity})`,
    bottomTint: `hsla(${tintHue}, 58%, 96%, ${opacity})`,
    midGlow: `rgba(255,255,255,${opacity})`,
  };
}

export function getListItemBorderTint(
  kirtan: Pick<KirtanSummary, "id" | "type" | "is_rare_gem">,
) {
  if (kirtan.is_rare_gem) {
    return "rgba(251, 191, 36, 0.65)";
  }

  const tintHue = getKirtanTintHue(kirtan);
  return `hsla(${tintHue}, 70%, 85%, 1)`;
}
