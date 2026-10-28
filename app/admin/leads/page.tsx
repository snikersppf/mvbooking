import Link from "next/link";
import { ZodError } from "zod";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { listLeads } from "@/server/services/leads/admin";
import { getTranslations } from "@/lib/i18n/server";

export default async function LeadsPage({ searchParams }: Readonly<{ searchParams: Promise<{ status?: string; page?: string }> }>) {
  const actor = await requireAdminPageRole(MANAGER_ADMIN_ROLES, "/admin/leads");
  const t = await getTranslations(), query = await searchParams;
  let result;
  try { result = await listLeads({ status: query.status || undefined, page: query.page }); }
  catch (error) { if (!(error instanceof ZodError)) throw error; }
  return <AdminPageShell role={actor.role} title={t("Enquiries")}>
    <form><label>{t("Status")}<select name="status" defaultValue={query.status ?? ""}>
      <option value="">{t("All")}</option>{["NEW", "IN_PROGRESS", "CLOSED"].map((status) => <option key={status} value={status}>{t(status)}</option>)}
    </select></label><button type="submit">{t("Apply filters")}</button></form>
    {!result ? <p role="alert">{t("Check the entered information and try again.")}</p> : <>
      <ul>{result.items.map((lead) => <li key={lead.id}><Link href={`/admin/leads/${lead.id}`}>{lead.name}</Link> — {t(lead.status)} — {lead.email || lead.phone}</li>)}</ul>
      {result.page > 1 && <Link href={`?page=${result.page - 1}${query.status ? `&status=${encodeURIComponent(query.status)}` : ""}`}>{t("Previous")}</Link>}
      {result.page * 20 < result.total && <Link href={`?page=${result.page + 1}${query.status ? `&status=${encodeURIComponent(query.status)}` : ""}`}>{t("Next")}</Link>}
    </>}
  </AdminPageShell>;
}
