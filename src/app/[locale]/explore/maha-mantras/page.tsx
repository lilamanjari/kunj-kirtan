import type { Metadata } from "next";
import MahaMantrasPageClient from "./MahaMantrasPageClient";
import { getMahaMantrasPageData } from "@/lib/server/mahaMantrasPage";
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
    route: "/explore/maha-mantras",
    title: seoCopy.mahaMantrasTitle,
    description: seoCopy.mahaMantrasDescription,
  });
}

export default async function LocalizedMahaMantrasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { data, error } = await getMahaMantrasPageData();

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch maha mantras page data");
  }

  const seoCopy = isLocale(locale) ? getSeoCopy(locale) : null;

  return (
    <>
      {isLocale(locale) && seoCopy ? (
        <JsonLd
          data={buildCollectionPageJsonLd({
            locale,
            route: "/explore/maha-mantras",
            name: seoCopy.mahaMantrasTitle,
            description: seoCopy.mahaMantrasDescription,
          })}
        />
      ) : null}
      <MahaMantrasPageClient initialData={data} />
    </>
  );
}
