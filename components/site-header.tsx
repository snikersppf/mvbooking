"use client";
import { useTranslations } from "@/components/i18n/language-provider";


import Link from "next/link";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import Header from "@/components/ui/header";
import { SessionProvider } from "next-auth/react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export function SiteHeaderNavigation() {
  const t = useTranslations();
  const navigationId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Header>
      <div className="site-header-inner" onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}>
        <Link className="site-header-brand" href="/" aria-label="MVBooking">
          <Image src="/design/MASTER-VADYA-PNG-logo@2x.png" alt="MVBooking" width={444} height={69} priority />
        </Link>
        <nav id={navigationId} className="site-header-nav" data-open={menuOpen} aria-label={t("Main navigation")} onClick={() => setMenuOpen(false)}>
          <Link href="/vehicles">{t("Vehicles")}</Link>
          <Link href="/#rental-conditions">{t("Условия аренды")}</Link>
          <Link href="/#how-it-works">{t("Как это работает")}</Link>
          <Link href="/#enquiry">{t("Контакты")}</Link>
        </nav>
        <LanguageSwitcher />
        <button ref={menuButton} className="site-menu-toggle" type="button" aria-label={t(menuOpen ? "Close navigation" : "Open navigation")} aria-expanded={menuOpen} aria-controls={navigationId} onClick={() => setMenuOpen((open) => !open)}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d={menuOpen ? "M6 6l12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </Header>
  );
}

export function SiteHeader() {
  return <SessionProvider><SiteHeaderNavigation /></SessionProvider>;
}
