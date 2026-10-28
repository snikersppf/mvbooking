import { leadStatusLabel } from "@/lib/lead-status";
import Link from "next/link";
import { ZodError } from "zod";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { firstAdminSearchParam, type RawAdminSearchParams } from "@/lib/admin-pages";
import { formatAdminDateTime } from "@/lib/admin-view";
import { getTranslations } from "@/lib/i18n/server";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { listLeads } from "@/server/services/leads/admin";

export async function BookingEnquiries({ searchParams }: Readonly<{ searchParams: RawAdminSearchParams }>) {
  const t = await getTranslations();
  const status = "NEW";
  let result;
  try {
    result = await listLeads({ status: status || undefined, page: firstAdminSearchParam(searchParams.newPage) });
  } catch (error) { if (!(error instanceof ZodError)) throw error; }
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    for (const key of ["view", "page"]) {
      const value = firstAdminSearchParam(searchParams[key]);
      if (value) query.set(key, value);
    }
    if (page > 1) query.set("newPage", String(page));
    return `/admin/bookings${query.size ? `?${query}` : ""}`;
  };
  const date = (value: Date | null) => value ? formatAdminDateTime(value.toISOString(), BOOKING_CONFIG.displayTimeZone, t.locale) : "—";
  return <section aria-labelledby="booking-enquiries-title">
    <h2 id="booking-enquiries-title">{t("New enquiries")}</h2>
    {!result ? <p role="alert">{t("Check the entered information and try again.")}</p> : <>
      {result.items.length ? <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr>{["Customer", "Email", "Phone", "Vehicle", "Period", "Status", "Action"].map((label) => <th key={label}>{t(label)}</th>)}</tr></thead>
        <tbody>{result.items.map((lead) => <tr key={lead.id}>
          <td>{lead.name}</td><td>{lead.email || "—"}</td><td>{lead.phone || "—"}</td>
          <td>{lead.vehicle ? `${lead.vehicle.brand} ${lead.vehicle.model}` : "—"}</td>
          <td>{date(lead.startDate)}<br />{date(lead.endDate)}</td><td>{t(leadStatusLabel(lead.status))}</td>
          <td><Link href={`/admin/bookings/requests/${encodeURIComponent(lead.id)}`}>{t("Review")}</Link></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState>{t("No new enquiries.")}</EmptyState>}
      <Pagination ariaLabel="Enquiry pages" page={result.page} totalPages={Math.max(1, Math.ceil(result.total / 20))}
        previousHref={result.page > 1 ? pageHref(result.page - 1) : null}
        nextHref={result.page * 20 < result.total ? pageHref(result.page + 1) : null} />
    </>}
  </section>;
}
