"use client";

import { createContext, useContext } from "react";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { AppDictionary } from "@/lib/i18n/types";
import { localizeHref } from "@/lib/i18n/localizeHref";
import { enDictionary } from "@/lib/i18n/dictionaries/en";

type LocaleContextValue = {
  locale: Locale;
  dictionary: AppDictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  locale,
  dictionary,
}: {
  children: React.ReactNode;
  locale: Locale;
  dictionary: AppDictionary;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dictionary }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  return ctx?.locale ?? defaultLocale;
}

export function useDictionary() {
  const ctx = useContext(LocaleContext);
  return ctx?.dictionary ?? enDictionary;
}

export function useLocalizedHref(href: string) {
  const locale = useLocale();
  return localizeHref(href, locale);
}
