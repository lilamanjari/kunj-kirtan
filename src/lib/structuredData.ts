import type { Locale } from "@/lib/i18n/config";
import { buildAbsoluteUrl, buildLocalizedPath, SITE_NAME, SITE_URL } from "@/lib/seo";

type BreadcrumbItem = {
  name: string;
  route: string;
};

type PageSchemaOptions = {
  locale: Locale;
  route: string;
  name: string;
  description: string;
};

type ProfileSchemaOptions = PageSchemaOptions & {
  image?: string | null;
};

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: buildAbsoluteUrl("/kirtan-icon.svg"),
  };
}

export function buildCollectionPageJsonLd({
  locale,
  route,
  name,
  description,
}: PageSchemaOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: buildAbsoluteUrl(buildLocalizedPath(locale, route)),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: locale,
  };
}

export function buildProfilePageJsonLd({
  locale,
  route,
  name,
  description,
  image,
}: ProfileSchemaOptions) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name,
    description,
    url: buildAbsoluteUrl(buildLocalizedPath(locale, route)),
    inLanguage: locale,
    ...(image ? { image } : {}),
    mainEntity: {
      "@type": "Person",
      name,
      ...(image ? { image } : {}),
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function buildBreadcrumbJsonLd(locale: Locale, items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(buildLocalizedPath(locale, item.route)),
    })),
  };
}

