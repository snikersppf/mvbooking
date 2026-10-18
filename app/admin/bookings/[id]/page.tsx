import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
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
  const t = await getTranslations();
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
      title={t("Booking details")}
      description={`${t("Booking ID")}: ${booking.id}`}
    >
      <Card as="section" className="admin-panel" aria-labelledby="booking-summary-title">
        <h2 id="booking-summary-title">{t("Summary")}</h2>
        <dl className="admin-detail-list">
          <div>
            <dt>{t("Status")}</dt>
            <dd>{t(formatAdminEnum(booking.status))}</dd>
          </div>
          <div>
            <dt>{t("Payment")}</dt>
            <dd>{t(formatAdminEnum(booking.paymentStatus))}</dd>
          </div>
          <div>
            <dt>{t("Customer")}</dt>
            <dd>
              {booking.user.name} ({booking.user.email})
            </dd>
          </div>
          <div>
            <dt>{t("Vehicle")}</dt>
            <dd>
              {booking.vehicle.brand} {booking.vehicle.model}
            </dd>
          </div>
          <div>
            <dt>{t("Pickup")}</dt>
            <dd>
              {formatAdminDateTime(booking.startDate, BOOKING_CONFIG.displayTimeZone, t.locale)}
              , {t(booking.pickupLocation)}
            </dd>
          </div>
          <div>
            <dt>{t("Return")}</dt>
            <dd>
              {formatAdminDateTime(booking.endDate, BOOKING_CONFIG.displayTimeZone, t.locale)}
              , {t(booking.returnLocation)}
            </dd>
          </div>
          <div>
            <dt>{t("Rental amount")}</dt>
            <dd>
              {booking.totalAmount} {t(booking.currency)}
            </dd>
          </div>
          <div>
            <dt>{t("Deposit")}</dt>
            <dd>
              {booking.depositAmount} {t(booking.currency)}
            </dd>
          </div>
          <div>
            <dt>{t("Total due")}</dt>
            <dd>
              {booking.totalDue} {t(booking.currency)}
            </dd>
          </div>
        </dl>
        <div className="admin-comment-grid">
          <div>
            <h3>{t("Customer comment")}</h3>
            <p>{booking.customerComment ?? t("No customer comment.")}</p>
          </div>
          <div>
            <h3>{t("Manager comment")}</h3>
            <p>{booking.managerComment ?? t("No manager comment.")}</p>
          </div>
        </div>
      </Card>

      <Card as="section" className="admin-panel" aria-labelledby="booking-status-title">
        <h2 id="booking-status-title">{t("Change status")}</h2>
        {allowedTransitions.length > 0 ? (
          <BookingStatusForm
            key={booking.status}
            bookingId={booking.id}
            allowedStatuses={allowedTransitions}
            managerComment={booking.managerComment}
          />
        ) : (
          <p className="empty-state">{t("No status transitions are available.")}</p>
        )}
      </Card>
    </AdminPageShell>
  );
}
