import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LeadAdminForm } from "@/components/leads/lead-admin-form";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { getLead } from "@/server/services/leads/admin";
import { getTranslations } from "@/lib/i18n/server";

export default async function LeadPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const actor = await requireAdminPageRole(MANAGER_ADMIN_ROLES, "/admin/leads");
  const lead = await getLead((await params).id), t = await getTranslations();
  if (!lead) notFound();
  return <AdminPageShell role={actor.role} title={lead.name}>
    <dl>{Object.entries({ Email: lead.email, Phone: lead.phone, Vehicle: lead.vehicleId, "Pickup date": lead.startDate?.toISOString(),
      "Return date": lead.endDate?.toISOString(), Comment: lead.comment, "Consent version": lead.consentVersion, "Consent at": lead.consentAt.toISOString(),
    }).map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value || "—"}</dd></div>)}</dl>
    <LeadAdminForm canDelete={actor.role === "ADMIN"} id={lead.id} status={lead.status} managerNote={lead.managerNote} />
  </AdminPageShell>;
}
