import type { KirtanSummary } from "@/types/kirtan";

type RailCardPalette = {
  borderTint: string;
  backgroundTint: string;
};

const railCardArtworkFiles = [
  "/garland.png",
  "/harmonium-art.png",
  "/karatalas.png",
  "/lotus.png",
  "/peacockfeather.png",
  "/butterpot.png",
  "/vrindavan.png",
  "/katyayani.png",
  "/house-program.png",
  "/ladies-kirtan.png",
  "/mrdanga.png",
  "/kartika.png",
  "/keshava-vrata.png",
  "/yamuna.png",
  "/kund.png",
] as const;

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
): RailCardPalette {
  if (kirtan.is_rare_gem) {
    return {
      borderTint: "var(--theme-page-home-rare-gem-border)",
      backgroundTint: "rgba(255, 250, 241, 0.96)",
    };
  }

  return {
    borderTint: "var(--theme-page-home-border)",
    backgroundTint: "var(--theme-page-home-surface-strong)",
  };
}

export function getRailCardArtworkSrc(kirtan: Pick<KirtanSummary, "id">) {
  return railCardArtworkFiles[hashHue(kirtan.id) % railCardArtworkFiles.length];
}

export function getListItemBorderTint(
  kirtan: Pick<KirtanSummary, "id" | "type" | "is_rare_gem">,
) {
  if (kirtan.is_rare_gem) {
    return "var(--theme-page-home-rare-gem-border)";
  }

  return "var(--theme-page-home-border)";
}
