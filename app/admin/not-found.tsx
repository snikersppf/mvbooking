import { getTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";

export default async function AdminNotFound() {
  const t = await getTranslations();
  return (
    <PageShell className="admin-shell">
      <h1>{t("Admin item not found")}</h1>
      <p>{t("The requested record does not exist.")}</p>
      <Link href="/admin">{t("Return to administration")}</Link>
    </PageShell>
  );
}

