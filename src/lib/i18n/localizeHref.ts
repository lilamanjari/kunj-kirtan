import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

function isExternalHref(href: string) {
  return /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

export function localizeHref(
  href: string,
  locale: Locale = defaultLocale,
) {
  if (!href || isExternalHref(href) || href.startsWith("#")) {
    return href;
  }

  if (href.startsWith("?")) {
    return `/${locale}${href}`;
  }

  if (!href.startsWith("/")) {
    return href;
  }

  const segments = href.split("/");
  const maybeLocale = segments[1];

  if (maybeLocale && isLocale(maybeLocale)) {
    return href;
  }

  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}
