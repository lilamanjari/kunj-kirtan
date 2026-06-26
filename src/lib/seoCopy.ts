import type { Locale } from "@/lib/i18n/config";

type SeoCopy = {
  homeTitle: string;
  homeDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  bhajansTitle: string;
  bhajansDescription: string;
  mahaMantrasTitle: string;
  mahaMantrasDescription: string;
  leadsTitle: string;
  leadsDescription: string;
  occasionsTitle: string;
  occasionsDescription: string;
  favoritesTitle: string;
  favoritesDescription: string;
  rareGemLabTitle: string;
  rareGemLabDescription: string;
  leadFallbackTitle: string;
  leadFallbackDescription: string;
  occasionFallbackTitle: string;
  occasionFallbackDescription: string;
  homeBreadcrumb: string;
  leadPageDescription: (name: string) => string;
  occasionPageDescription: (name: string) => string;
};

const seoCopyByLocale: Record<Locale, SeoCopy> = {
  en: {
    homeTitle: "Sacred sounds, lovingly curated",
    homeDescription:
      "Browse bhajans, Maha Mantras, lead singers, and devotional occasions in the Kunj Kirtans archive.",
    aboutTitle: "About",
    aboutDescription:
      "Learn about Kunj Kirtans, the devotional music archive, and the spirit behind its curation.",
    bhajansTitle: "Bhajans",
    bhajansDescription:
      "Explore bhajans from the Kunj Kirtans archive, with curated recordings, lead singers, and devotional themes.",
    mahaMantrasTitle: "Maha Mantras",
    mahaMantrasDescription:
      "Listen to curated Maha Mantra recordings with sequence numbers, lead singers, and devotional context.",
    leadsTitle: "Lead Singers",
    leadsDescription:
      "Browse lead singers in the Kunj Kirtans archive and discover their bhajans, Maha Mantras, and hari-katha.",
    occasionsTitle: "Occasions",
    occasionsDescription:
      "Find devotional music curated around festivals, observances, and sacred occasions in the Kunj Kirtans archive.",
    favoritesTitle: "Favorites",
    favoritesDescription: "Your saved Kunj Kirtans recordings.",
    rareGemLabTitle: "Rare Gem Lab",
    rareGemLabDescription: "Experimental rare gem curation tools for Kunj Kirtans.",
    leadFallbackTitle: "Lead singer",
    leadFallbackDescription:
      "Explore devotional recordings from the Kunj Kirtans archive.",
    occasionFallbackTitle: "Occasion",
    occasionFallbackDescription:
      "Explore devotional recordings from the Kunj Kirtans archive.",
    homeBreadcrumb: "Home",
    leadPageDescription: (name) =>
      `Listen to bhajans, Maha Mantras, and hari-katha led by ${name} in the Kunj Kirtans archive.`,
    occasionPageDescription: (name) =>
      `Explore bhajans and Maha Mantras curated for ${name} in the Kunj Kirtans archive.`,
  },
  ru: {
    homeTitle: "Священные звуки, заботливо собранные",
    homeDescription:
      "Слушайте бхаджаны, маха-мантры, киртании и подборки по духовным событиям в архиве Kunj Kirtans.",
    aboutTitle: "О Kunj Kirtans",
    aboutDescription:
      "Узнайте о Kunj Kirtans, архиве преданного пения, и о духе, с которым он собирается.",
    bhajansTitle: "Бхаджаны",
    bhajansDescription:
      "Исследуйте бхаджаны из архива Kunj Kirtans: записи, киртании и духовные настроения.",
    mahaMantrasTitle: "Маха-мантры",
    mahaMantrasDescription:
      "Слушайте тщательно подобранные записи маха-мантры с номерами последовательности, киртаниями и духовным контекстом.",
    leadsTitle: "Киртании",
    leadsDescription:
      "Откройте для себя киртаниев архива Kunj Kirtans и их бхаджаны, маха-мантры и хари-катху.",
    occasionsTitle: "События",
    occasionsDescription:
      "Найдите преданную музыку, собранную по праздникам, памятным дням и священным событиям в архиве Kunj Kirtans.",
    favoritesTitle: "Избранное",
    favoritesDescription: "Ваши сохраненные записи Kunj Kirtans.",
    rareGemLabTitle: "Лаборатория редких жемчужин",
    rareGemLabDescription:
      "Экспериментальные инструменты для отбора редких жемчужин Kunj Kirtans.",
    leadFallbackTitle: "Киртания",
    leadFallbackDescription:
      "Исследуйте преданные записи из архива Kunj Kirtans.",
    occasionFallbackTitle: "Событие",
    occasionFallbackDescription:
      "Исследуйте преданные записи из архива Kunj Kirtans.",
    homeBreadcrumb: "Главная",
    leadPageDescription: (name) =>
      `Слушайте бхаджаны, маха-мантры и хари-катху в исполнении ${name} в архиве Kunj Kirtans.`,
    occasionPageDescription: (name) =>
      `Исследуйте бхаджаны и маха-мантры, собранные для «${name}», в архиве Kunj Kirtans.`,
  },
};

export function getSeoCopy(locale: Locale) {
  return seoCopyByLocale[locale];
}

