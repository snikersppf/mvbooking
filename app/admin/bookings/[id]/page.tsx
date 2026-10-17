import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BookingStatusForm } from "@/components/admin/booking-status-form";
import { formatAdminDateTime, formatAdminEnum } from "@/lib/admin-view";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { MANAGER_BOOKING_TRANSITIONS } from "@/server/config/booking-status";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { getAdminBooking } from "@/server/services/admin/bookings";

type AdminBookingPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function AdminBookingPage({
  params,
}: AdminBookingPageProps) {
  const actor = await requireAdminPageRole(
    MANAGER_ADMIN_ROLES,
    "/admin/bookings",
  );
  const { id } = await params;
  const booking = await getAdminBooking(id);
  if (!booking) notFound();
  const allowedTransitions = MANAGER_BOOKING_TRANSITIONS[booking.status];

  return (
    <AdminPageShell
      role={actor.role}
      title="Booking details"
      description={`Booking ID: ${booking.id}`}
    >
      <section className="admin-panel" aria-labelledby="booking-summary-title">
        <h2 id="booking-summary-title">Summary</h2>
        <dl className="admin-detail-list">
          <div>
            <dt>Status</dt>
            <dd>{formatAdminEnum(booking.status)}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{formatAdminEnum(booking.paymentStatus)}</dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>
              {booking.user.name} ({booking.user.email})
            </dd>
          </div>
          <div>
            <dt>Vehicle</dt>
            <dd>
              {booking.vehicle.brand} {booking.vehicle.model}
            </dd>
          </div>
          <div>
            <dt>Pickup</dt>
            <dd>
              {formatAdminDateTime(
                booking.startDate,
                BOOKING_CONFIG.displayTimeZone,
              )}
              , {booking.pickupLocation}
            </dd>
          </div>
          <div>
            <dt>Return</dt>
            <dd>
              {formatAdminDateTime(
                booking.endDate,
                BOOKING_CONFIG.displayTimeZone,
              )}
              , {booking.returnLocation}
            </dd>
          </div>
          <div>
            <dt>Rental amount</dt>
            <dd>
              {booking.totalAmount} {booking.currency}
            </dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>
              {booking.depositAmount} {booking.currency}
            </dd>
          </div>
          <div>
            <dt>Total due</dt>
            <dd>
              {booking.totalDue} {booking.currency}
            </dd>
          </div>
        </dl>
        <div className="admin-comment-grid">
          <div>
            <h3>Customer comment</h3>
            <p>{booking.customerComment ?? "No customer comment."}</p>
          </div>
          <div>
            <h3>Manager comment</h3>
            <p>{booking.managerComment ?? "No manager comment."}</p>
          </div>
        </div>
      </section>

      <section className="admin-panel" aria-labelledby="booking-status-title">
        <h2 id="booking-status-title">Change status</h2>
        {allowedTransitions.length > 0 ? (
          <BookingStatusForm
            key={booking.status}
            bookingId={booking.id}
            allowedStatuses={allowedTransitions}
            managerComment={booking.managerComment}
          />
        ) : (
          <p className="empty-state">No status transitions are available.</p>
        )}
      </section>
    </AdminPageShell>
  );
}
