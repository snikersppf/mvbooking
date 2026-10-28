import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { adminDashboardItems } from "@/lib/admin-navigation";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";

export default async function AdminPage() {
  const t = await getTranslations();
  const actor = await requireAdminPageRole(MANAGER_ADMIN_ROLES, "/admin");
  const dashboardItems = adminDashboardItems();

  return (
    <AdminPageShell
      role={actor.role}
      title={t("Administration")}
      description={t("Manage the rental catalog and booking workflow.")}
    >
      <section className="admin-card-grid" aria-label={t("Administration areas")}>
        {dashboardItems.map((item) => (
          <Card as="article" key={item.href} className="admin-card">
            <h2>{t(item.label)}</h2>
            <p>{t(item.description)}</p>
            <Link href={item.href}>{t(item.actionLabel)}</Link>
          </Card>
        ))}
      </section>
    </AdminPageShell>
  );
}
