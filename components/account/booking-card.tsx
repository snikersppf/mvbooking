import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { CancelBookingButton } from "@/components/account/cancel-booking-button";
import { QuoteSummary } from "@/components/booking/quote-summary";
import {
  canCustomerCancelBooking,
  formatBookingDateTime,
  formatBookingStatus,
} from "@/lib/booking-view";
import type { CustomerBookingDto } from "@/server/services/booking/customer-booking-dto";

type BookingCardProps = Readonly<{
  booking: CustomerBookingDto;
  displayTimeZone: string;
}>;

export async function BookingCard({
  booking,
  displayTimeZone,
}: BookingCardProps) {
  const t = await getTranslations();
  const titleId = "booking-" + booking.id;
  const cancellable = canCustomerCancelBooking(
    booking.status,
    booking.paymentStatus,
  );

  return (
    <Card as="article" className="booking-card" aria-labelledby={titleId}>
      <header className="booking-card-header">
        <div>
          <p className="eyebrow">{t("Booking")}</p>
          <h2 id={titleId}>
            {booking.vehicle ? (
              <Link href={"/vehicles/" + booking.vehicle.slug}>
                {booking.vehicle.brand} {booking.vehicle.model}
              </Link>
            ) : (
              t("Vehicle ") + booking.vehicleId
            )}
          </h2>
        </div>
        <p>
          {t(formatBookingStatus(booking.status))} ·{" "}
          {t(formatBookingStatus(booking.paymentStatus))}
        </p>
      </header>

      <dl className="booking-details">
        <div>
          <dt>{t("Pickup")}</dt>
          <dd>
            {formatBookingDateTime(booking.startDate, displayTimeZone, t.locale)}
            <br />
            {t(booking.pickupLocation)}
          </dd>
        </div>
        <div>
          <dt>{t("Return")}</dt>
          <dd>
            {formatBookingDateTime(booking.endDate, displayTimeZone, t.locale)}
            <br />
            {t(booking.returnLocation)}
          </dd>
        </div>
      </dl>

      <QuoteSummary quote={booking} />

      {booking.customerComment ? (
        <div className="booking-comment">
          <h3>{t("Comment")}</h3>
          <p>{booking.customerComment}</p>
        </div>
      ) : null}

      {cancellable ? (
        <CancelBookingButton bookingId={booking.id} />
      ) : null}
    </Card>
  );
}
