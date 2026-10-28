import { leadStatusLabel } from "@/lib/lead-status";
import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { ZodError } from "zod";
import { BookingEnquiries } from "@/components/leads/booking-enquiries";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminListFilterForm } from "@/components/admin/list-filter-form";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { adminListPageHref, firstAdminSearchParam, type RawAdminSearchParams } from "@/lib/admin-pages";
import { formatAdminDateTime, formatAdminEnum } from "@/lib/admin-view";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { listBookingWorklist } from "@/server/services/admin/booking-worklist";

export default async function AdminBookingsPage({ searchParams }: Readonly<{ searchParams: Promise<RawAdminSearchParams> }>) {
  const t = await getTranslations();
  const actor = await requireAdminPageRole(MANAGER_ADMIN_ROLES, "/admin/bookings");
  const query = await searchParams;
  const view = firstAdminSearchParam(query.view) || "active";
  let result;
  try { result = await listBookingWorklist({ view, page: firstAdminSearchParam(query.page) }); }
  catch (error) { if (!(error instanceof ZodError)) throw error; }
  const filters = { view, newPage: firstAdminSearchParam(query.newPage) };
  const date = (value: Date | null) => value ? formatAdminDateTime(value.toISOString(), BOOKING_CONFIG.displayTimeZone, t.locale) : "—";
  return <AdminPageShell role={actor.role} title={t("Bookings")}
    description={`${t("Dates and times are shown in")} ${t(BOOKING_CONFIG.displayTimeZone)}.`}>
    <BookingEnquiries searchParams={query} />
    <section aria-labelledby="booking-worklist-title">
      <h2 id="booking-worklist-title">{t(view === "past" ? "Past requests" : "Active bookings")}</h2>
      <AdminListFilterForm action="/admin/bookings" hiddenFields={{ newPage: filters.newPage }} fields={[
        { name: "view", label: "Show", value: view, includeAll: false, options: [
          { value: "active", label: "Active bookings" }, { value: "past", label: "Past requests" },
        ] },
      ]} />
      {!result ? <p role="alert">{t("The booking filters are invalid.")}</p> : <>
        {result.items.length ? <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr>{["Customer", "Email", "Phone", "Vehicle", "Period", "Status", "Total due", "Action"].map((label) => <th key={label}>{t(label)}</th>)}</tr></thead>
          <tbody>{result.items.map((item) => <tr key={`${item.kind}:${item.id}`}>
            <td>{item.name}</td><td>{item.email || "—"}</td><td>{item.phone || "—"}</td><td>{item.vehicle || "—"}</td>
            <td>{date(item.startDate)}<br />{date(item.endDate)}</td>
            <td>{t(item.kind === "enquiry" ? leadStatusLabel(item.status) : formatAdminEnum(item.status))}</td>
            <td>{item.totalDue === null ? "—" : `${item.totalDue} ${t(item.currency)}`}</td>
            <td><Link href={item.kind === "enquiry" ? `/admin/bookings/requests/${encodeURIComponent(item.id)}` : `/admin/bookings/${encodeURIComponent(item.id)}`}>{t("Review")}</Link></td>
          </tr>)}</tbody>
        </table></div> : <EmptyState>{t("No requests in this view.")}</EmptyState>}
        <Pagination ariaLabel="Booking pages" page={result.page} totalPages={result.totalPages}
          previousHref={result.page > 1 ? adminListPageHref("/admin/bookings", filters, result.page - 1) : null}
          nextHref={result.page < result.totalPages ? adminListPageHref("/admin/bookings", filters, result.page + 1) : null} />
      </>}
    </section>
  </AdminPageShell>;
}
