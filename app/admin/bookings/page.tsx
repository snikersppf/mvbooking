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
      title="Bookings"
      description={`Dates and times are shown in ${BOOKING_CONFIG.displayTimeZone}.`}
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
          The booking filters are invalid.
        </p>
      ) : bookings.items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Period</th>
                <th>Status</th>
                <th>Total due</th>
                <th>Action</th>
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
                    {formatAdminDateTime(
                      booking.startDate,
                      BOOKING_CONFIG.displayTimeZone,
                    )}
                    <br />
                    {formatAdminDateTime(
                      booking.endDate,
                      BOOKING_CONFIG.displayTimeZone,
                    )}
                  </td>
                  <td>{formatAdminEnum(booking.status)}</td>
                  <td>
                    {booking.totalDue} {booking.currency}
                  </td>
                  <td>
                    <Link href={`/admin/bookings/${encodeURIComponent(booking.id)}`}>
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No bookings match this status.</EmptyState>
      )}

      {bookings ? (
        <Pagination
          ariaLabel="Booking pages"
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

