import Link from "next/link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { adminDashboardItems } from "@/lib/admin-navigation";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";

export default async function AdminPage() {
  const actor = await requireAdminPageRole(MANAGER_ADMIN_ROLES, "/admin");
  const dashboardItems = adminDashboardItems(actor.role);

  return (
    <AdminPageShell
      role={actor.role}
      title="Administration"
      description="Manage the rental catalog and booking workflow."
    >
      <section className="admin-card-grid" aria-label="Administration areas">
        {dashboardItems.map((item) => (
          <article key={item.href} className="admin-card">
            <h2>{item.label}</h2>
            <p>{item.description}</p>
            <Link href={item.href}>{item.actionLabel}</Link>
          </article>
        ))}
      </section>
    </AdminPageShell>
  );
}
