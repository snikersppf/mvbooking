"use client";

import { UserRole } from "@prisma/client";
import Link from "next/link";
import { SessionProvider, useSession } from "next-auth/react";
import { SignOutButton } from "@/components/sign-out-button";

type SiteHeaderProps = Readonly<{
  signedIn: boolean;
  canAccessAdmin: boolean;
  loading?: boolean;
}>;

export function SiteHeaderNavigation({ signedIn, canAccessAdmin, loading = false }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-header-brand" href="/">MVBooking</Link>
        <nav className="site-header-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/vehicles">Vehicles</Link>
          {signedIn ? (
            <>
              <Link href="/account/bookings">My bookings</Link>
              {canAccessAdmin ? <Link href="/admin">Administration</Link> : null}
              <SignOutButton />
            </>
          ) : loading ? null : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/register">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
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
