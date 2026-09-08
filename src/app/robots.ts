import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/api",
          "/en/favorites",
          "/ru/favorites",
          "/en/history",
          "/ru/history",
          "/en/rare-gem-lab",
          "/ru/rare-gem-lab",
        ],
      },
    ],
    sitemap: "https://www.kunjkirtans.com/sitemap.xml",
  };
}
