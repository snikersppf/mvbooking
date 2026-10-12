"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelCustomerBooking,
  describeBookingRequestFailure,
  type BookingRequestFailure,
} from "@/components/booking/api-client";
import { buildLoginHref } from "@/lib/auth/redirect";

type CancelBookingButtonProps = Readonly<{
  bookingId: string;
}>;

export function CancelBookingButton({
  bookingId,
}: CancelBookingButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<BookingRequestFailure | null>(null);
  const [cancelled, setCancelled] = useState(false);

  async function cancelBooking(): Promise<void> {
    if (!window.confirm("Cancel this booking?")) return;

    setSubmitting(true);
    setFailure(null);
    try {
      await cancelCustomerBooking(bookingId);
      setCancelled(true);
      router.refresh();
    } catch (error) {
      setFailure(describeBookingRequestFailure(error, "cancel"));
    } finally {
      setSubmitting(false);
    }
  }

  if (cancelled) {
    return (
      <p className="status-message status-success" role="status">
        Booking cancelled.
      </p>
    );
  }

  return (
    <div className="booking-card-action">
      <button
        className="button button-danger"
        type="button"
        disabled={submitting}
        onClick={cancelBooking}
      >
        {submitting ? "Cancelling…" : "Cancel booking"}
      </button>
      {failure ? (
        <p className="status-message status-error" role="alert">
          {failure.message}{" "}
          {failure.requiresSignIn ? (
            <Link href={buildLoginHref("/account/bookings")}>Sign in</Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
