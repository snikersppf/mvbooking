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

export function BookingCard({
  booking,
  displayTimeZone,
}: BookingCardProps) {
  const titleId = "booking-" + booking.id;
  const cancellable = canCustomerCancelBooking(
    booking.status,
    booking.paymentStatus,
  );

  return (
    <Card as="article" className="booking-card" aria-labelledby={titleId}>
      <header className="booking-card-header">
        <div>
          <p className="eyebrow">Booking</p>
          <h2 id={titleId}>
            {booking.vehicle ? (
              <Link href={"/vehicles/" + booking.vehicle.slug}>
                {booking.vehicle.brand} {booking.vehicle.model}
              </Link>
            ) : (
              "Vehicle " + booking.vehicleId
            )}
          </h2>
        </div>
        <p>
          {formatBookingStatus(booking.status)} ·{" "}
          {formatBookingStatus(booking.paymentStatus)}
        </p>
      </header>

      <dl className="booking-details">
        <div>
          <dt>Pickup</dt>
          <dd>
            {formatBookingDateTime(booking.startDate, displayTimeZone)}
            <br />
            {booking.pickupLocation}
          </dd>
        </div>
        <div>
          <dt>Return</dt>
          <dd>
            {formatBookingDateTime(booking.endDate, displayTimeZone)}
            <br />
            {booking.returnLocation}
          </dd>
        </div>
      </dl>

      <QuoteSummary quote={booking} />

      {booking.customerComment ? (
        <div className="booking-comment">
          <h3>Comment</h3>
          <p>{booking.customerComment}</p>
        </div>
      ) : null}

      {cancellable ? (
        <CancelBookingButton bookingId={booking.id} />
      ) : null}
    </Card>
  );
}
