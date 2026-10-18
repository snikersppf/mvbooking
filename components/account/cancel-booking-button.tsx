"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";

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
  const t = useTranslations();
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
        {t("Booking cancelled.")}</p>
    );
  }

  return (
    <div className="booking-card-action">
      <Button
        className="button button-danger"
        type="button"
        disabled={submitting}
        onClick={cancelBooking}
      >
        {submitting ? t("Cancelling…") : t("Cancel booking")}
      </Button>
      {failure ? (
        <p className="status-message status-error" role="alert">
          {t.error(failure.message)}{" "}
          {failure.requiresSignIn ? (
            <Link href={buildLoginHref("/account/bookings")}>{t("Sign in")}</Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
