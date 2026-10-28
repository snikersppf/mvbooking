import { leadStatusLabel } from "@/lib/lead-status";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Card } from "@/components/ui/card";
import { LeadAdminForm } from "@/components/leads/lead-admin-form";
import { formatAdminDateTime } from "@/lib/admin-view";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { getLead } from "@/server/services/leads/admin";
import { getTranslations } from "@/lib/i18n/server";

export default async function LeadPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const actor = await requireAdminPageRole(MANAGER_ADMIN_ROLES, "/admin/bookings");
  const lead = await getLead((await params).id), t = await getTranslations();
  if (!lead) notFound();
  const date = (value: Date | null) => value ? formatAdminDateTime(value.toISOString(), BOOKING_CONFIG.displayTimeZone, t.locale) : "—";
  const details = {
    Status: t(leadStatusLabel(lead.status)), Customer: lead.name, Email: lead.email, Phone: lead.phone,
    Vehicle: lead.vehicle ? `${lead.vehicle.brand} ${lead.vehicle.model}` : null,
    Pickup: date(lead.startDate), Return: date(lead.endDate), "Created at": date(lead.createdAt),
  };
  return <AdminPageShell role={actor.role} title={t("Enquiry details")} description={`${t("Enquiry ID")}: ${lead.id}`}>
    <Link href="/admin/bookings">{t("Back to bookings")}</Link>
    <Card as="section" className="admin-panel" aria-labelledby="enquiry-summary-title">
      <h2 id="enquiry-summary-title">{t("Summary")}</h2>
      <dl className="admin-detail-list">{Object.entries(details).map(([label, value]) => <div key={label}>
        <dt>{t(label)}</dt><dd>{value || "—"}</dd>
      </div>)}</dl>
      <div className="admin-comment-grid">
        <div><h3>{t("Customer comment")}</h3><p>{lead.comment || t("No customer comment.")}</p></div>
        <div><h3>{t("Manager comment")}</h3><p>{lead.managerNote || t("No manager comment.")}</p></div>
      </div>
    </Card>
    <Card as="section" className="admin-panel" aria-labelledby="enquiry-status-title">
      <h2 id="enquiry-status-title">{t("Change status")}</h2>
      <LeadAdminForm id={lead.id} status={lead.status} managerNote={lead.managerNote} canDelete={actor.role === "ADMIN"} />
    </Card>
  </AdminPageShell>;
}
