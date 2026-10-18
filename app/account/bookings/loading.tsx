import { getTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/ui/page-shell";
export default async function AccountBookingsLoading() {
  const t = await getTranslations();
  return (
    <PageShell className="account-shell" aria-busy="true">
      <header className="account-header">
        <h1>{t("Your bookings")}</h1>
      </header>
      <p className="status-message">{t("Loading bookings…")}</p>
    </PageShell>
  );
}
