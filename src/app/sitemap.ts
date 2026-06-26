import type { MetadataRoute } from "next";
import { getOccasionsPageData } from "@/lib/server/occasionsPage";
import { fetchLeadDirectory } from "@/lib/server/leadDirectory";
import { supportedLocales } from "@/lib/i18n/config";
import { buildAbsoluteUrl, buildLocalizedPath } from "@/lib/seo";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/explore/bhajans",
  "/explore/maha-mantras",
  "/explore/leads",
  "/explore/occasions",
] as const;

function localizedEntries(route: string, lastModified: Date) {
  return supportedLocales.map((locale) => ({
    url: buildAbsoluteUrl(buildLocalizedPath(locale, route)),
    lastModified,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of PUBLIC_ROUTES) {
    entries.push(...localizedEntries(route, lastModified));
  }

  const [{ leads, error: leadsError }, occasionsResult] = await Promise.all([
    fetchLeadDirectory(),
    getOccasionsPageData(),
  ]);

  if (!leadsError) {
    for (const lead of leads) {
      entries.push(
        ...localizedEntries(`/explore/leads/${lead.slug}`, lastModified),
      );
    }
  }

  if (!occasionsResult.error && occasionsResult.data) {
    for (const occasion of occasionsResult.data.occasions) {
      entries.push(
        ...localizedEntries(`/explore/occasions/${occasion.slug}`, lastModified),
      );
    }
  }

  return entries;
}

