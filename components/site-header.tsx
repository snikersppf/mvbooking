"use client";
import { useTranslations } from "@/components/i18n/language-provider";


import Link from "next/link";
import Image from "next/image";
import Header from "@/components/ui/header";
import { SessionProvider } from "next-auth/react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export function SiteHeaderNavigation() {
  const t = useTranslations();
  return (
    <Header>
      <div className="site-header-inner">
        <Link className="site-header-brand" href="/" aria-label="MVBooking">
          <Image src="/design/MASTER-VADYA-PNG-logo@2x.png" alt="MVBooking" width={444} height={69} priority />
        </Link>
        <nav className="site-header-nav" aria-label={t("Main navigation")}>
          <Link href="/vehicles">{t("Vehicles")}</Link>
          <Link href="/#rental-conditions">{t("Условия аренды")}</Link>
          <Link href="/#how-it-works">{t("Как это работает")}</Link>
          <Link href="/#enquiry">{t("Контакты")}</Link>
        </nav>
        <LanguageSwitcher />
      </div>
    </Header>
  );
}

export function SiteHeader() {
  return <SessionProvider><SiteHeaderNavigation /></SessionProvider>;
}
