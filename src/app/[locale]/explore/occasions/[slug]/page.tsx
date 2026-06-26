import type { Metadata } from "next";
import OccasionDetailClient from "./OccasionDetailClient";
import { getOccasionPageData } from "@/lib/server/occasionPage";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import JsonLd from "@/lib/components/JsonLd";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
} from "@/lib/structuredData";
import { getSeoCopy } from "@/lib/seoCopy";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const seoCopy = getSeoCopy(locale);

  const { data, status } = await getOccasionPageData(slug);

  if (status === 404 || !data) {
    return buildPageMetadata({
      locale,
      route: `/explore/occasions/${slug}`,
      title: seoCopy.occasionFallbackTitle,
      description: seoCopy.occasionFallbackDescription,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    locale,
    route: `/explore/occasions/${slug}`,
    title: data.tag.name,
    description: seoCopy.occasionPageDescription(data.tag.name),
    image: data.featured?.lead_singer_image_url ?? undefined,
  });
}

export default async function LocalizedOccasionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const { data, status, error } = await getOccasionPageData(slug);

  if (status === 404) {
    notFound();
  }

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("Failed to fetch occasion page data");
  }

  const seoCopy = isLocale(locale) ? getSeoCopy(locale) : null;

  return (
    <>
      {isLocale(locale) && seoCopy ? (
        <>
          <JsonLd
            data={buildCollectionPageJsonLd({
              locale,
              route: `/explore/occasions/${slug}`,
              name: data.tag.name,
              description: seoCopy.occasionPageDescription(data.tag.name),
            })}
          />
          <JsonLd
            data={buildBreadcrumbJsonLd(locale, [
              { name: seoCopy.homeBreadcrumb, route: "/" },
              { name: seoCopy.occasionsTitle, route: "/explore/occasions" },
              { name: data.tag.name, route: `/explore/occasions/${slug}` },
            ])}
          />
        </>
      ) : null}
      <OccasionDetailClient initialData={data} />
    </>
  );
}
