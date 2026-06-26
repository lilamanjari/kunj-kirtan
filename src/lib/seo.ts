import type { Metadata } from "next";
import { supportedLocales, type Locale } from "@/lib/i18n/config";
import { localizeHref } from "@/lib/i18n/localizeHref";

export const SITE_NAME = "Kunj Kirtans";
export const SITE_URL = "https://www.kunjkirtans.com";
const DEFAULT_OG_IMAGE = "/og-kunj-kirtans.jpg";

export function buildLocalizedPath(locale: Locale, route = "/") {
  return localizeHref(route || "/", locale);
}

export function buildAbsoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function buildLocaleAlternates(locale: Locale, route = "/") {
  const languages = Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      buildAbsoluteUrl(buildLocalizedPath(locale, route)),
    ]),
  ) as Record<Locale, string>;

  return {
    canonical: buildAbsoluteUrl(buildLocalizedPath(locale, route)),
    languages,
  };
}

type SeoOptions = {
  locale: Locale;
  route?: string;
  title: string;
  description: string;
  image?: string;
  noIndex?: boolean;
};

export function buildPageMetadata({
  locale,
  route = "/",
  title,
  description,
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: SeoOptions): Metadata {
  const localizedPath = buildLocalizedPath(locale, route);
  const absoluteUrl = buildAbsoluteUrl(localizedPath);
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    alternates: buildLocaleAlternates(locale, route),
    openGraph: {
      title: fullTitle,
      description,
      url: absoluteUrl,
      siteName: SITE_NAME,
      locale,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
        },
  };
}
