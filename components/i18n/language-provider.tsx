"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createTranslator, DEFAULT_LOCALE, type Locale, type Translator } from "@/lib/i18n/translate";

type LanguageContextValue = Readonly<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
}>;

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: createTranslator(DEFAULT_LOCALE),
});

export function LanguageProvider({ initialLocale, children }: Readonly<{ initialLocale: Locale; children?: ReactNode }>) {
  const [locale, setLocale] = useState(initialLocale);
  const value = useMemo(() => ({ locale, setLocale, t: createTranslator(locale) }), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslations(): Translator {
  return useLanguage().t;
}
