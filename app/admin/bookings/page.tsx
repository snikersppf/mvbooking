import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { ZodError } from "zod";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminListFilterForm } from "@/components/admin/list-filter-form";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { ADMIN_BOOKING_STATUSES } from "@/lib/admin-input";
import {
  adminBookingListInput,
  adminListPageHref,
  firstAdminSearchParam,
  type RawAdminSearchParams,
} from "@/lib/admin-pages";
import { formatAdminDateTime, formatAdminEnum } from "@/lib/admin-view";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { listAdminBookings } from "@/server/services/admin/bookings";

type AdminBookingsPageProps = Readonly<{
  searchParams: Promise<RawAdminSearchParams>;
}>;

export default async function AdminBookingsPage({
  searchParams,
}: AdminBookingsPageProps) {
  const t = await getTranslations();
  const actor = await requireAdminPageRole(
    MANAGER_ADMIN_ROLES,
    "/admin/bookings",
  );
  const rawSearchParams = await searchParams;
  const listInput = adminBookingListInput(rawSearchParams);
  let bookings;
  try {
    bookings = await listAdminBookings(listInput);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    bookings = null;
  }
  const status = firstAdminSearchParam(rawSearchParams.status);
  const filters = { status };

  return (
    <AdminPageShell
      role={actor.role}
      title={t("Bookings")}
      description={`${t("Dates and times are shown in")} ${t(BOOKING_CONFIG.displayTimeZone)}.`}
    >
      <AdminListFilterForm
        action="/admin/bookings"
        fields={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: ADMIN_BOOKING_STATUSES.map((value) => ({
              value,
              label: formatAdminEnum(value),
            })),
          },
        ]}
      />

      {!bookings ? (
        <p className="status-message status-error" role="alert">
          {t("The booking filters are invalid.")}</p>
      ) : bookings.items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Booking")}</th>
                <th>{t("Customer")}</th>
                <th>{t("Vehicle")}</th>
                <th>{t("Period")}</th>
                <th>{t("Status")}</th>
                <th>{t("Total due")}</th>
                <th>{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.items.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>
                    {booking.user.name}
                    <br />
                    <span className="muted-text">{booking.user.email}</span>
                  </td>
                  <td>
                    {booking.vehicle.brand} {booking.vehicle.model}
                  </td>
                  <td>
                    {formatAdminDateTime(booking.startDate, BOOKING_CONFIG.displayTimeZone, t.locale)}
                    <br />
                    {formatAdminDateTime(booking.endDate, BOOKING_CONFIG.displayTimeZone, t.locale)}
                  </td>
                  <td>{t(formatAdminEnum(booking.status))}</td>
                  <td>
                    {booking.totalDue} {t(booking.currency)}
                  </td>
                  <td>
                    <Link href={`/admin/bookings/${encodeURIComponent(booking.id)}`}>
                      {t("Review")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>{t("No bookings match this status.")}</EmptyState>
      )}

      {bookings ? (
        <Pagination
          ariaLabel={t("Booking pages")}
          page={bookings.page}
          totalPages={bookings.totalPages}
          previousHref={
            bookings.hasPreviousPage
              ? adminListPageHref("/admin/bookings", filters, bookings.page - 1)
              : null
          }
          nextHref={
            bookings.hasNextPage
              ? adminListPageHref("/admin/bookings", filters, bookings.page + 1)
              : null
          }
        />
      ) : null}
    </AdminPageShell>
  );
}

