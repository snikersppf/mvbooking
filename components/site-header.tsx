"use client";
import { useTranslations } from "@/components/i18n/language-provider";


import { UserRole } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/ui/header";
import { SessionProvider, useSession } from "next-auth/react";
import { SignOutButton } from "@/components/sign-out-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

type SiteHeaderProps = Readonly<{
  signedIn: boolean;
  canAccessAdmin: boolean;
  loading?: boolean;
}>;

export function SiteHeaderNavigation({ signedIn, canAccessAdmin, loading = false }: SiteHeaderProps) {
  const t = useTranslations();
  return (
    <Header>
      <div className="site-header-inner">
        <Link className="site-header-brand" href="/" aria-label="MVBooking">
          <Image src="/design/MASTER-VADYA-PNG-logo@2x.png" alt="MVBooking" width={444} height={69} priority />
        </Link>
        <nav className="site-header-nav" aria-label={t("Main navigation")}>
          <Link href="/">{t("Home")}</Link>
          <Link href="/vehicles">{t("Vehicles")}</Link>
          {signedIn ? (
            <>
              {canAccessAdmin ? <Link href="/admin">{t("Administration")}</Link> : null}
              <SignOutButton />
            </>
          ) : loading ? null : (
            <>
              <Link href="/login">{t("Staff sign in")}</Link>
            </>
          )}
        </nav>
        <LanguageSwitcher />
      </div>
    </Header>
  );
}

function SiteHeaderContent() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user?.id);
  const canAccessAdmin = signedIn && (
    session?.user?.role === UserRole.MANAGER ||
    session?.user?.role === UserRole.ADMIN
  );

  return (
    <SiteHeaderNavigation
      signedIn={signedIn}
      canAccessAdmin={canAccessAdmin}
      loading={status === "loading"}
    />
  );
}

export function SiteHeader() {
  return (
    <SessionProvider>
      <SiteHeaderContent />
    </SessionProvider>
  );
}
