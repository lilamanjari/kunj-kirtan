import type { CSSProperties } from "react";

export type FeaturedCardPalette = {
  cardClassName: string;
  cardStyle?: CSSProperties;
  playbackRingColor: string;
  featuredLabelColor: string;
  contextLineColor: string;
  metadataLabelColor: string;
  leadsingerLabelColor: string;
};

export type PagePalette = {
  featuredCard: FeaturedCardPalette;
};

export const greenSurfaceTheme = {
  borderColor: "#d9e7d0",
  textColor: "#445643",
  shadowColor: "rgba(94, 129, 86, 0.2)",
  backgroundColor: "rgba(247, 252, 244, 0.94)",
  ringClassName: "ring-[#bdd8b0]/70",
  labelClassName: "text-[#6f8d66]",
  contextClassName: "text-[#76906d]",
  metadataClassName: "text-[#71836b]",
  leadsingerClassName: "text-[#5b6d55]",
  buttonBorderColor: "#d4e5ca",
  buttonTextColor: "#6f8b60",
  buttonShadowColor: "rgba(116, 148, 98, 0.16)",
} as const;

export const homePalette: PagePalette = {
  featuredCard: {
    cardClassName:
      "border border-[color:var(--theme-page-home-border)] bg-[color:var(--theme-page-home-surface)] text-[color:var(--theme-page-home-text)] shadow-[0_18px_34px_var(--theme-page-home-shadow)]",
    cardStyle: {
      backgroundColor: "var(--theme-page-home-surface)",
    },
    playbackRingColor: "ring-[#ddb5c0]/55",
    featuredLabelColor: "text-[color:var(--theme-page-home-section-label)]",
    contextLineColor: "text-[color:var(--theme-page-home-soft-text)]",
    metadataLabelColor: "text-[color:var(--theme-page-home-muted)]",
    leadsingerLabelColor: "text-[color:var(--theme-page-home-muted)]",
  },
};

export const homeSharedPalette: FeaturedCardPalette = {
  cardClassName: "border backdrop-blur-sm",
  cardStyle: {
    backgroundColor: greenSurfaceTheme.backgroundColor,
    borderColor: greenSurfaceTheme.borderColor,
    color: greenSurfaceTheme.textColor,
    boxShadow: `0 20px 42px ${greenSurfaceTheme.shadowColor}`,
  },
  playbackRingColor: greenSurfaceTheme.ringClassName,
  featuredLabelColor: greenSurfaceTheme.labelClassName,
  contextLineColor: greenSurfaceTheme.contextClassName,
  metadataLabelColor: greenSurfaceTheme.metadataClassName,
  leadsingerLabelColor: greenSurfaceTheme.leadsingerClassName,
};

export const mahaMantrasPalette: PagePalette = {
  featuredCard: {
    cardClassName:
      "border border-[#e6d5d1] text-[#5f4037] shadow-[0_20px_42px_rgba(156,104,93,0.26)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 249, 243, 0.92)",
    },
    playbackRingColor: "ring-[#e1c2a8]/65",
    featuredLabelColor: "text-[#a17968]",
    contextLineColor: "text-[#bc8a72]",
    metadataLabelColor: "text-[#9f7d6e]",
    leadsingerLabelColor: "text-[#866257]",
  },
};

export const bhajansPalette: PagePalette = {
  featuredCard: {
    cardClassName:
      "border border-[#ebdcc0] text-[#5b3f48] shadow-[0_20px_42px_rgba(168,123,41,0.26)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 248, 247, 0.92)",
    },
    playbackRingColor: "ring-[#e2bfd0]/65",
    featuredLabelColor: "text-[#9f7381]",
    contextLineColor: "text-[#bb8390]",
    metadataLabelColor: "text-[#9a7681]",
    leadsingerLabelColor: "text-[#82606a]",
  },
};

export const leadsPalette: PagePalette = {
  featuredCard: {
    cardClassName:
      "border border-[#fdf3da] text-[#5c463e] shadow-[0_20px_42px_rgba(196,157,58,0.26)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 249, 244, 0.92)",
    },
    playbackRingColor: "ring-[#dbbfac]/65",
    featuredLabelColor: "text-[#9e7b69]",
    contextLineColor: "text-[#b48d75]",
    metadataLabelColor: "text-[#96786a]",
    leadsingerLabelColor: "text-[#7d665a]",
  },
};

export const occasionsPalette: PagePalette = {
  featuredCard: {
    cardClassName:
      "border border-[#f5dada] text-[#5b463c] shadow-[0_20px_42px_rgba(165,55,55,0.20)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 249, 244, 0.92)",
    },
    playbackRingColor: "ring-[#dec2ae]/65",
    featuredLabelColor: "text-[#9b7a69]",
    contextLineColor: "text-[#b68a72]",
    metadataLabelColor: "text-[#95786c]",
    leadsingerLabelColor: "text-[#7d665b]",
  },
};
