"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

export default function AdminError({
  unstable_retry,
}: Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>) {
  const t = useTranslations();
  return (
    <PageShell className="admin-shell">
      <div className="status-message status-error" role="alert">
        <h1>{t("Administration is unavailable")}</h1>
        <p>{t("The data could not be loaded.")}</p>
        <Button className="button" type="button" onClick={unstable_retry}>
          {t("Try again")}</Button>
      </div>
    </PageShell>
  );
}

