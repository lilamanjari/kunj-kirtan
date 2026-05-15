import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/en/about",
        permanent: false,
      },
      {
        source: "/favorites",
        destination: "/en/favorites",
        permanent: false,
      },
      {
        source: "/rare-gem-lab",
        destination: "/en/rare-gem-lab",
        permanent: false,
      },
      {
        source: "/explore/bhajans",
        destination: "/en/explore/bhajans",
        permanent: false,
      },
      {
        source: "/explore/maha-mantras",
        destination: "/en/explore/maha-mantras",
        permanent: false,
      },
      {
        source: "/explore/leads",
        destination: "/en/explore/leads",
        permanent: false,
      },
      {
        source: "/explore/leads/:slug",
        destination: "/en/explore/leads/:slug",
        permanent: false,
      },
      {
        source: "/explore/occasions",
        destination: "/en/explore/occasions",
        permanent: false,
      },
      {
        source: "/explore/occasions/:slug",
        destination: "/en/explore/occasions/:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
