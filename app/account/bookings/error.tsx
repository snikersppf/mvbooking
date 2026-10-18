"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

type AccountBookingsErrorProps = Readonly<{
  reset: () => void;
}>;

export default function AccountBookingsError({
  reset,
}: AccountBookingsErrorProps) {
  const t = useTranslations();
  return (
    <PageShell className="account-shell">
      <header className="account-header">
        <h1>{t("Your bookings")}</h1>
      </header>
      <div className="status-message status-error" role="alert">
        <p>{t("Bookings could not be loaded.")}</p>
        <Button className="button" type="button" onClick={reset}>
          {t("Try again")}</Button>
      </div>
    </PageShell>
  );
}
