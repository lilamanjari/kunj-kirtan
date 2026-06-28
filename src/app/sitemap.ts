import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { getDisplayKirtanTitle } from "@/lib/server/bhajanDisplayTitle";
import { getOccasionsPageData } from "@/lib/server/occasionsPage";
import { fetchLeadDirectory } from "@/lib/server/leadDirectory";
import { buildKirtanDetailRoute } from "@/lib/kirtanDetailHref";
import { supportedLocales } from "@/lib/i18n/config";
import { buildAbsoluteUrl, buildLocalizedPath } from "@/lib/seo";
import type { PlayableKirtanRow } from "@/types/kirtan";

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

  const { data: kirtanRows, error: kirtansError } = await supabase
    .from("playable_kirtans_with_titles")
    .select(
      [
        "id",
        "audio_url",
        "type",
        "title",
        "display_title",
        "official_title",
        "first_line_title",
        "lead_singer",
        "lead_singer_id",
        "recorded_date",
        "recorded_date_precision",
        "sanga",
        "duration_seconds",
        "sequence_num",
      ].join(","),
    )
    .returns<PlayableKirtanRow[]>();

  if (!kirtansError) {
    for (const kirtan of kirtanRows ?? []) {
      entries.push(
        ...localizedEntries(
          buildKirtanDetailRoute({
            id: kirtan.id,
            title: getDisplayKirtanTitle(kirtan),
            lead_singer: kirtan.lead_singer,
          }),
          lastModified,
        ),
      );
    }
  }

  return entries;
}
