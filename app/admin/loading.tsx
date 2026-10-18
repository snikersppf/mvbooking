import { getTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/ui/page-shell";
export default async function AdminLoading() {
  const t = await getTranslations();
  return (
    <PageShell className="admin-shell" aria-busy="true">
      <p className="status-message">{t("Loading administration data…")}</p>
    </PageShell>
  );
}

