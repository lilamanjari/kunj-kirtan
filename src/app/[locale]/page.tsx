import type { Metadata } from "next";
import HomePage from "@/app/HomePage";
import { isLocale } from "@/lib/i18n/config";
import { buildPageMetadata } from "@/lib/seo";
import JsonLd from "@/lib/components/JsonLd";
import { buildCollectionPageJsonLd } from "@/lib/structuredData";
import { getSeoCopy } from "@/lib/seoCopy";

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
    title: seoCopy.homeTitle,
    description: seoCopy.homeDescription,
  });
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return <HomePage />;
  }

  const seoCopy = getSeoCopy(locale);

  return (
    <>
      <JsonLd
        data={buildCollectionPageJsonLd({
          locale,
          route: "/",
          name: "Kunj Kirtans",
          description: seoCopy.homeDescription,
        })}
      />
      <HomePage />
    </>
  );
}
