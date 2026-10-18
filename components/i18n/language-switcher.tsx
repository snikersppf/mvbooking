"use client";


import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/translate";
import { useLanguage } from "./language-provider";
import styles from "./language-switcher.module.css";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeLanguage(nextLocale: Locale) {
    if (nextLocale === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setLocale(nextLocale);
    // Refresh server-rendered copy while preserving client form state and URLs.
    startTransition(() => router.refresh());
  }

  return (
    <div className={styles.switcher} role="group" aria-label={t("Language")} aria-busy={pending}>
      <Button type="button" aria-pressed={locale === "ru"} disabled={pending} onClick={() => changeLanguage("ru")}>RU</Button>
      <Button type="button" aria-pressed={locale === "en"} disabled={pending} onClick={() => changeLanguage("en")}>EN</Button>
    </div>
  );
}
