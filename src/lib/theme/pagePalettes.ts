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

export const homePalette: PagePalette = {
  featuredCard: {
    cardClassName:
      "border border-[#f2b79d] text-[#5e433a] shadow-[0_20px_42px_rgba(164,112,87,0.26)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 248, 243, 0.9)",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,250,246,0.92) 0%, rgba(252,241,235,0.92) 56%, rgba(249,232,228,0.92) 100%)",
    },
    playbackRingColor: "ring-[#ddb5c0]/55",
    featuredLabelColor: "text-[#9d7b70]",
    contextLineColor: "text-[#b98473]",
    metadataLabelColor: "text-[#9c7b72]",
    leadsingerLabelColor: "text-[#87675f]",
  },
};

export const mahaMantrasPalette: PagePalette = {
  featuredCard: {
    cardClassName:
      "border border-[#e6d5d1] text-[#5f4037] shadow-[0_20px_42px_rgba(156,104,93,0.26)] backdrop-blur-sm",
    cardStyle: {
      backgroundColor: "rgba(255, 249, 243, 0.92)",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,251,246,0.94) 0%, rgba(252,243,236,0.92) 56%, rgba(222,199,194,0.9) 100%)",
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
      backgroundImage:
        "linear-gradient(145deg, rgba(255, 250, 246,0.94) 0%, rgba(241,231,213,0.92) 56%, rgba(187,137,45,0.4) 100%)",
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
      backgroundImage:
        "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(253,243,218,0.72) 56%, rgba(245,196,72,0.5) 100%)",
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
      backgroundImage:
        "linear-gradient(145deg, rgba(250,236,236,0.75) 0%, rgba(253,243,218,0.5) 56%, rgba(206,69,69,0.2) 100%)",
    },
    playbackRingColor: "ring-[#dec2ae]/65",
    featuredLabelColor: "text-[#9b7a69]",
    contextLineColor: "text-[#b68a72]",
    metadataLabelColor: "text-[#95786c]",
    leadsingerLabelColor: "text-[#7d665b]",
  },
};
