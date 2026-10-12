"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  describeBookingRequestFailure,
  requestVehicleQuote,
  submitBooking,
  type BookingRequestFailure,
} from "@/components/booking/api-client";
import {
  bookingPayloadFingerprint,
  createBookingFormSchema,
  quoteInputFingerprint,
  toCreateBookingPayload,
  toQuoteDateRange,
  type BookingFormValues,
} from "@/components/booking/form-schema";
import {
  resolveIdempotencyEntry,
  type IdempotencyEntry,
} from "@/components/booking/idempotency";
import { QuoteSummary } from "@/components/booking/quote-summary";
import { buildLoginHref } from "@/lib/auth/redirect";
import type { CustomerBookingDto } from "@/server/services/booking/customer-booking-dto";
import type { VehicleAvailabilityResult } from "@/server/services/availability/check-vehicle";

type BookingFormProps = Readonly<{
  vehicleId: string;
  vehicleSlug: string;
  defaultLocation: string;
  displayTimeZone: string;
  maxDurationDays: number;
}>;

type QuoteState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "loading"; fingerprint: string }>
  | Readonly<{
      status: "ready";
      fingerprint: string;
      result: VehicleAvailabilityResult;
    }>
  | Readonly<{
      status: "error";
      fingerprint: string;
      failure: BookingRequestFailure;
    }>;

type SubmissionState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "error"; failure: BookingRequestFailure }>
  | Readonly<{ status: "success"; booking: CustomerBookingDto }>;

function FieldError({ message }: Readonly<{ message?: string }>) {
  return message ? (
    <p className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function BookingForm({
  vehicleId,
  vehicleSlug,
  defaultLocation,
  displayTimeZone,
  maxDurationDays,
}: BookingFormProps) {
  const schema = useMemo(
    () =>
      createBookingFormSchema({
        displayTimeZone,
        maxDurationDays,
      }),
    [displayTimeZone, maxDurationDays],
  );
  const {
    control,
    getValues,
    handleSubmit,
    register,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: "",
      endDate: "",
      pickupLocation: defaultLocation,
      returnLocation: defaultLocation,
      customerComment: "",
    },
  });
  const watchedDates = useWatch({
    control,
    name: ["startDate", "endDate"],
  });
  const currentQuoteFingerprint = quoteInputFingerprint({
    startDate: watchedDates[0] ?? "",
    endDate: watchedDates[1] ?? "",
  });
  const [quoteState, setQuoteState] = useState<QuoteState>({
    status: "idle",
  });
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>({ status: "idle" });
  const [idempotencyEntry, setIdempotencyEntry] =
    useState<IdempotencyEntry | null>(null);
  const loginHref = buildLoginHref("/vehicles/" + vehicleSlug);
  const quoteIsCurrent =
    (quoteState.status === "ready" ||
      quoteState.status === "error" ||
      quoteState.status === "loading") &&
    quoteState.fingerprint === currentQuoteFingerprint;
  const currentQuote =
    quoteState.status === "ready" && quoteIsCurrent
      ? quoteState.result
      : null;
  const canSubmit = Boolean(currentQuote?.available);

  async function checkQuote(): Promise<void> {
    const datesValid = await trigger(["startDate", "endDate"]);
    if (!datesValid) return;

    const values = getValues();
    const fingerprint = quoteInputFingerprint(values);
    setSubmissionState({ status: "idle" });
    setQuoteState({ status: "loading", fingerprint });

    try {
      const result = await requestVehicleQuote(
        vehicleSlug,
        toQuoteDateRange(values, displayTimeZone),
      );
      setQuoteState({ status: "ready", fingerprint, result });
    } catch (error) {
      setQuoteState({
        status: "error",
        fingerprint,
        failure: describeBookingRequestFailure(error, "quote"),
      });
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    const fingerprint = quoteInputFingerprint(values);
    if (
      quoteState.status !== "ready" ||
      quoteState.fingerprint !== fingerprint ||
      !quoteState.result.available
    ) {
      setSubmissionState({
        status: "error",
        failure: {
          message: "Check availability and price before booking.",
          requiresSignIn: false,
        },
      });
      return;
    }

    const payload = toCreateBookingPayload(
      vehicleId,
      values,
      displayTimeZone,
    );
    const nextEntry = resolveIdempotencyEntry(
      idempotencyEntry,
      bookingPayloadFingerprint(payload),
      () => globalThis.crypto.randomUUID(),
    );
    setIdempotencyEntry(nextEntry);
    setSubmissionState({ status: "idle" });

    try {
      const result = await submitBooking(payload, nextEntry.key);
      setSubmissionState({
        status: "success",
        booking: result.booking,
      });
    } catch (error) {
      setSubmissionState({
        status: "error",
        failure: describeBookingRequestFailure(error, "create"),
      });
    }
  });

  return (
    <form className="booking-form" onSubmit={onSubmit} noValidate>
      <p className="muted-text">
        Times are entered in {displayTimeZone}. A quote does not reserve the
        vehicle.
      </p>

      <div className="booking-form-grid">
        <label>
          Pickup date and time
          <input
            type="datetime-local"
            step="60"
            aria-invalid={Boolean(errors.startDate)}
            {...register("startDate")}
          />
          <FieldError message={errors.startDate?.message} />
        </label>
        <label>
          Return date and time
          <input
            type="datetime-local"
            step="60"
            aria-invalid={Boolean(errors.endDate)}
            {...register("endDate")}
          />
          <FieldError message={errors.endDate?.message} />
        </label>
        <label>
          Pickup location
          <input
            autoComplete="street-address"
            aria-invalid={Boolean(errors.pickupLocation)}
            {...register("pickupLocation")}
          />
          <FieldError message={errors.pickupLocation?.message} />
        </label>
        <label>
          Return location
          <input
            autoComplete="street-address"
            aria-invalid={Boolean(errors.returnLocation)}
            {...register("returnLocation")}
          />
          <FieldError message={errors.returnLocation?.message} />
        </label>
      </div>

      <label>
        Comment
        <textarea
          rows={4}
          aria-invalid={Boolean(errors.customerComment)}
          {...register("customerComment")}
        />
        <FieldError message={errors.customerComment?.message} />
      </label>

      <div className="form-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={quoteState.status === "loading"}
          onClick={checkQuote}
        >
          {quoteState.status === "loading" ? "Checking…" : "Check price"}
        </button>
        <button
          className="button"
          type="submit"
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Request booking"}
        </button>
      </div>

      <div aria-live="polite">
        {quoteState.status === "error" && quoteIsCurrent ? (
          <p className="status-message status-error">
            {quoteState.failure.message}{" "}
            {quoteState.failure.requiresSignIn ? (
              <Link href={loginHref}>Sign in</Link>
            ) : null}
          </p>
        ) : null}
        {quoteState.status === "ready" && quoteIsCurrent ? (
          <section
            className={
              quoteState.result.available
                ? "status-message status-success"
                : "status-message status-error"
            }
          >
            <h3>
              {quoteState.result.available ? "Available" : "Not available"}
            </h3>
            <QuoteSummary quote={quoteState.result.quote} />
          </section>
        ) : null}
        {quoteState.status === "ready" && !quoteIsCurrent ? (
          <p className="status-message">
            Dates changed. Check the price again.
          </p>
        ) : null}
      </div>

      {submissionState.status === "error" ? (
        <p className="status-message status-error" role="alert">
          {submissionState.failure.message}{" "}
          {submissionState.failure.requiresSignIn ? (
            <Link href={loginHref}>Sign in</Link>
          ) : null}
        </p>
      ) : null}
      {submissionState.status === "success" ? (
        <div className="status-message status-success" role="status">
          <p>Booking request created.</p>
          <Link href="/account/bookings">View your bookings</Link>
        </div>
      ) : null}
    </form>
  );
}
