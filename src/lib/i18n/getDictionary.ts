import { enDictionary } from "@/lib/i18n/dictionaries/en";
import { ruDictionary } from "@/lib/i18n/dictionaries/ru";
import type { Locale } from "@/lib/i18n/config";

export async function getDictionary(locale: Locale) {
  switch (locale) {
    case "ru":
      return ruDictionary;
    case "en":
    default:
      return enDictionary;
  }
}
