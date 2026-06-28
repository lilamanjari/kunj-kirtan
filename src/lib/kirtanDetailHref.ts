import type { Locale } from "@/lib/i18n/config";
import { localizeHref } from "@/lib/i18n/localizeHref";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PREFIX_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-|$)/i;
const MAX_SLUG_LENGTH = 96;

type KirtanDetailHrefSource = {
  id: string;
  title: string;
  lead_singer?: string | null;
};

function slugifySegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildKirtanSlug({ title, lead_singer }: KirtanDetailHrefSource) {
  const slug = slugifySegment([title, lead_singer].filter(Boolean).join(" "));

  if (!slug) {
    return "";
  }

  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
}

export function extractKirtanIdFromSlugParam(value: string) {
  const trimmedValue = value.trim();

  if (UUID_PATTERN.test(trimmedValue)) {
    return trimmedValue;
  }

  const matchedPrefix = trimmedValue.match(UUID_PREFIX_PATTERN);
  return matchedPrefix?.[1] ?? null;
}

export function buildKirtanDetailRoute(kirtan: KirtanDetailHrefSource) {
  const slug = buildKirtanSlug(kirtan);
  return slug ? `/kirtans/${kirtan.id}-${slug}` : `/kirtans/${kirtan.id}`;
}

export function buildLocalizedKirtanDetailPath(
  locale: Locale,
  kirtan: KirtanDetailHrefSource,
) {
  return localizeHref(buildKirtanDetailRoute(kirtan), locale);
}
