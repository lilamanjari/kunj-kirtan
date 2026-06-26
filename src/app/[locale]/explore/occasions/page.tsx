import type { Metadata } from "next";
import OccasionsPageClient from "./OccasionsPageClient";
import { getOccasionsPageData } from "@/lib/server/occasionsPage";
import { isLocale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import JsonLd from "@/lib/components/JsonLd";
import { buildCollectionPageJsonLd } from "@/lib/structuredData";
import { getSeoCopy } from "@/lib/seoCopy";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const seoCopy = getSeoCopy(locale);

  return buildPageMetadata({
    locale,
    route: "/explore/occasions",
    title: seoCopy.occasionsTitle,
    description: seoCopy.occasionsDescription,
  });
}

export default async function LocalizedOccasionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data, error } = await getOccasionsPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch occasions page data");
  }

  const seoCopy = isLocale(locale) ? getSeoCopy(locale) : null;

  return (
    <>
      {isLocale(locale) && seoCopy ? (
        <JsonLd
          data={buildCollectionPageJsonLd({
            locale,
            route: "/explore/occasions",
            name: seoCopy.occasionsTitle,
            description: seoCopy.occasionsDescription,
          })}
        />
      ) : null}
      <OccasionsPageClient occasions={data.occasions} />
    </>
  );
}
