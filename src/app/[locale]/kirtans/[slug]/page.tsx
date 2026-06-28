import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KirtanDetailPageClient from "./KirtanDetailPageClient";
import { isLocale } from "@/lib/i18n/config";
import {
  buildKirtanDetailRoute,
  extractKirtanIdFromSlugParam,
} from "@/lib/kirtanDetailHref";
import { buildPageMetadata } from "@/lib/seo";
import { getSeoCopy } from "@/lib/seoCopy";
import { getPublicKirtanPageData } from "@/lib/server/kirtanPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const kirtanId = extractKirtanIdFromSlugParam(slug);
  const seoCopy = getSeoCopy(locale);

  if (!kirtanId) {
    return buildPageMetadata({
      locale,
      route: `/kirtans/${slug}`,
      title: seoCopy.homeTitle,
      description: seoCopy.homeDescription,
      noIndex: true,
    });
  }

  const { data, status } = await getPublicKirtanPageData(kirtanId);

  if (status === 404 || !data) {
    return buildPageMetadata({
      locale,
      route: `/kirtans/${slug}`,
      title: seoCopy.homeTitle,
      description: seoCopy.homeDescription,
      noIndex: true,
    });
  }

  const title = data.kirtan.title;
  const description = data.kirtan.lead_singer
    ? `${title} by ${data.kirtan.lead_singer} on Kunj Kirtans.`
    : `${title} on Kunj Kirtans.`;

  return buildPageMetadata({
    locale,
    route: buildKirtanDetailRoute(data.kirtan),
    title,
    description,
    image: data.kirtan.lead_singer_image_url ?? undefined,
  });
}

export default async function LocalizedKirtanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kirtanId = extractKirtanIdFromSlugParam(slug);

  if (!kirtanId) {
    notFound();
  }

  const { data, status, error } = await getPublicKirtanPageData(kirtanId);

  if (status === 404) {
    notFound();
  }

  if (error || !data) {
    throw new Error(error ?? "Failed to fetch kirtan page data");
  }

  return <KirtanDetailPageClient data={data} />;
}
