import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kunj Kirtans",
    short_name: "Kunj Kirtans",
    description: "Sacred sounds, lovingly curated.",
    start_url: "/en",
    display: "standalone",
    background_color: "#f7ece7",
    theme_color: "#6f9752",
    icons: [
      {
        src: "/kirtan-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
