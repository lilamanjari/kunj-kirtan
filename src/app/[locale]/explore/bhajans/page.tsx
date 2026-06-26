import type { Metadata } from "next";
import BhajansPageClient from "./BhajansPageClient";
import { getBhajansPageData } from "@/lib/server/bhajansPage";
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
    route: "/explore/bhajans",
    title: seoCopy.bhajansTitle,
    description: seoCopy.bhajansDescription,
  });
}

export default async function LocalizedBhajansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data, error } = await getBhajansPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch bhajans page data");
  }

  const seoCopy = isLocale(locale) ? getSeoCopy(locale) : null;

  return (
    <>
      {isLocale(locale) && seoCopy ? (
        <JsonLd
          data={buildCollectionPageJsonLd({
            locale,
            route: "/explore/bhajans",
            name: seoCopy.bhajansTitle,
            description: seoCopy.bhajansDescription,
          })}
        />
      ) : null}
      <BhajansPageClient initialData={data} />
    </>
  );
}
