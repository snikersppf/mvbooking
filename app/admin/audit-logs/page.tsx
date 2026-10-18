import { getTranslations } from "@/lib/i18n/server";
import { ZodError } from "zod";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminListFilterForm } from "@/components/admin/list-filter-form";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import {
  adminAuditLogListInput,
  adminListPageHref,
  firstAdminSearchParam,
  type RawAdminSearchParams,
} from "@/lib/admin-pages";
import {
  formatAdminDateTime,
  formatAdminEnum,
  formatAuditMetadata,
} from "@/lib/admin-view";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { ADMIN_ONLY_ROLES } from "@/server/services/admin/authorization";
import { listAdminAuditLogs } from "@/server/services/admin/audit-logs";

type AdminAuditLogsPageProps = Readonly<{
  searchParams: Promise<RawAdminSearchParams>;
}>;

export default async function AdminAuditLogsPage({
  searchParams,
}: AdminAuditLogsPageProps) {
  const t = await getTranslations();
  const actor = await requireAdminPageRole(
    ADMIN_ONLY_ROLES,
    "/admin/audit-logs",
    "/admin",
  );
  const rawSearchParams = await searchParams;
  const listInput = adminAuditLogListInput(rawSearchParams);
  let logs;
  try {
    logs = await listAdminAuditLogs(listInput);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    logs = null;
  }
  const action = firstAdminSearchParam(rawSearchParams.action);
  const entity = firstAdminSearchParam(rawSearchParams.entity);
  const filters = { action, entity };

  return (
    <AdminPageShell
      role={actor.role}
      title={t("Audit logs")}
      description={t("Administrative changes recorded by the application.")}
    >
      <AdminListFilterForm
        action="/admin/audit-logs"
        fields={[
          { name: "action", label: "Action", value: action },
          { name: "entity", label: "Entity", value: entity },
        ]}
      />

      {!logs ? (
        <p className="status-message status-error" role="alert">
          {t("The audit log filters are invalid.")}</p>
      ) : logs.items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Time")}</th>
                <th>{t("Actor")}</th>
                <th>{t("Action")}</th>
                <th>{t("Entity")}</th>
                <th>{t("Metadata")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.items.map((log) => (
                <tr key={log.id}>
                  <td>
                    {formatAdminDateTime(log.createdAt, BOOKING_CONFIG.displayTimeZone, t.locale)}
                  </td>
                  <td>
                    {log.user.name}
                    <br />
                    <span className="muted-text">{log.user.email}</span>
                  </td>
                  <td>{t(formatAdminEnum(log.action))}</td>
                  <td>
                    {t(log.entity)}: {log.entityId}
                  </td>
                  <td>
                    <pre className="admin-metadata">{formatAuditMetadata(log.metadata)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>{t("No audit logs match these filters.")}</EmptyState>
      )}

      {logs ? (
        <Pagination
          ariaLabel={t("Audit log pages")}
          page={logs.page}
          totalPages={logs.totalPages}
          previousHref={
            logs.hasPreviousPage
              ? adminListPageHref("/admin/audit-logs", filters, logs.page - 1)
              : null
          }
          nextHref={
            logs.hasNextPage
              ? adminListPageHref("/admin/audit-logs", filters, logs.page + 1)
              : null
          }
        />
      ) : null}
    </AdminPageShell>
  );
}

