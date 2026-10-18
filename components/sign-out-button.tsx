"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  const t = useTranslations();
  return (
    <Button
      className="site-header-sign-out"
      type="button"
      onClick={() => { void signOut({ redirectTo: "/" }); }}
    >
      {t("Sign out")}</Button>
  );
}
