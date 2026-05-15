export const supportedLocales = ["en", "ru"] as const;

export const plannedLocales = ["es"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

export const localeHeaderName = "x-kunj-locale";

const intlLocaleMap: Record<Locale, string> = {
  en: "en-GB",
  ru: "ru-RU",
};

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function getIntlLocale(locale: Locale) {
  return intlLocaleMap[locale];
}
