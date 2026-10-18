"use client";
import { useTranslations } from "@/components/i18n/language-provider";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import styles from "./booking-page.module.css";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
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
  vehicleSummary?: ReactNode;
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
  const t = useTranslations();
  return message ? (
    <p className="field-error" role="alert">
      {t.error(message)}
    </p>
  ) : null;
}

export function BookingForm({
  vehicleId,
  vehicleSlug,
  defaultLocation,
  displayTimeZone,
  maxDurationDays,
  vehicleSummary,
}: BookingFormProps) {
  const t = useTranslations();
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
  const loginHref = buildLoginHref("/vehicles/" + vehicleSlug + "/booking");
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
    <form className={`${styles.form} booking-form`} onSubmit={onSubmit} noValidate>
      <div className={styles.sections}>
        <Card className={styles.section} id="trip-parameters" aria-labelledby="trip-title">
          <header className={styles.sectionHeading}>
            <Badge className={styles.sectionNumber}>01</Badge>
            <div>
              <p className={styles.eyebrow}>{t("ПАРАМЕТРЫ ПОЕЗДКИ")}</p>
              <h2 id="trip-title">{t("Где и когда вам нужен автомобиль?")}</h2>
              <p>{t("Укажите место, дату и удобное время получения автомобиля.")}</p>
            </div>
          </header>
          <div className={styles.tripFields}>
            <label className={`${styles.field} ${styles.locationField}`}>
              {t("Pickup location")}<Input
                autoComplete="street-address"
                aria-invalid={Boolean(errors.pickupLocation)}
                {...register("pickupLocation")}
              />
              <FieldError message={errors.pickupLocation?.message} />
            </label>
            <label className={styles.field}>
              {t("Pickup date and time")}<Input
                type="datetime-local"
                step="60"
                aria-invalid={Boolean(errors.startDate)}
                {...register("startDate")}
              />
              <FieldError message={errors.startDate?.message} />
            </label>
            <label className={`${styles.field} ${styles.locationField}`}>
              {t("Return location")}<Input
                autoComplete="street-address"
                aria-invalid={Boolean(errors.returnLocation)}
                {...register("returnLocation")}
              />
              <FieldError message={errors.returnLocation?.message} />
            </label>
            <label className={styles.field}>
              {t("Return date and time")}<Input
                type="datetime-local"
                step="60"
                aria-invalid={Boolean(errors.endDate)}
                {...register("endDate")}
              />
              <FieldError message={errors.endDate?.message} />
            </label>
          </div>
          <p className={styles.notice}>
            {t("Times are entered in ")}{t(displayTimeZone)}{t(". A quote does not reserve the vehicle.")}</p>
          <div className={styles.checkPrice}>
            <Button
              className="button button-secondary"
              type="button"
              disabled={quoteState.status === "loading"}
              onClick={checkQuote}
            >
              {quoteState.status === "loading" ? t("Checking…") : t("Check price")}
            </Button>
          </div>
        </Card>

        <Card className={styles.section} id="renter-details" aria-labelledby="renter-title">
          <header className={styles.sectionHeading}>
            <Badge className={styles.sectionNumber}>02</Badge>
            <div>
              <p className={styles.eyebrow}>{t("ДАННЫЕ АРЕНДАТОРА")}</p>
              <h2 id="renter-title">{t("Бронирование через ваш аккаунт")}</h2>
              <p>{t("Для отправки заявки необходимо войти в аккаунт. Контактные данные указываются при регистрации.")}</p>
            </div>
          </header>
          {/* TODO: check connection — driver details from the reference require an approved schema/API extension. */}
          <p className={styles.notice}>{t("После отправки заявки её статус можно отслеживать в личном кабинете.")}</p>
        </Card>

        <Card className={styles.section} id="booking-comment" aria-labelledby="comment-title">
          <header className={styles.sectionHeading}>
            <Badge className={styles.sectionNumber}>03</Badge>
            <div>
              <p className={styles.eyebrow}>{t("ДОПОЛНИТЕЛЬНО")}</p>
              <h2 id="comment-title">{t("Расскажите о вашей поездке")}</h2>
              <p>{t("Оставьте пожелания или уточнения к бронированию.")}</p>
            </div>
          </header>
          {/* TODO: check connection — extras and consent fields are not part of the existing booking payload. */}
          <label className={styles.field}>
            {t("Comment")}<Textarea
              rows={4}
              aria-invalid={Boolean(errors.customerComment)}
              {...register("customerComment")}
            />
            <FieldError message={errors.customerComment?.message} />
          </label>
        </Card>

        <Card className={styles.section} id="how-it-works" aria-labelledby="confirmation-title">
          <header className={styles.sectionHeading}>
            <Badge className={styles.sectionNumber}>04</Badge>
            <div>
              <p className={styles.eyebrow}>{t("ПОДТВЕРЖДЕНИЕ")}</p>
              <h2 id="confirmation-title">{t("Проверьте данные перед отправкой")}</h2>
              <p>{t("Проверьте даты и места получения и возврата. Перед отправкой заявки запросите расчёт стоимости.")}</p>
            </div>
          </header>
          <div className={styles.confirmationLinks}>
            <Link href="#trip-parameters">{t("Проверить параметры поездки ↑")}</Link>
            <Link href="#booking-price">{t("Посмотреть расчёт →")}</Link>
          </div>
          <div className={styles.submitAction}>
            <Button
              className="button"
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? t("Submitting…") : t("Request booking")}
            </Button>
          </div>
          <p className={styles.caption}>{t("Отправленная заявка появится в разделе «Мои бронирования».")}</p>
          {submissionState.status === "error" ? (
            <p className="status-message status-error" role="alert">
              {t.error(submissionState.failure.message)}{" "}
              {submissionState.failure.requiresSignIn ? (
                <Link href={loginHref}>{t("Sign in")}</Link>
              ) : null}
            </p>
          ) : null}
          {submissionState.status === "success" ? (
            <div className="status-message status-success" role="status">
              <p>{t("Booking request created.")}</p>
              <Link href="/account/bookings">{t("View your bookings")}</Link>
            </div>
          ) : null}
        </Card>
      </div>

      <aside className={styles.sidebar} aria-label={t("Автомобиль и стоимость поездки")}>
        <Card className={styles.summaryCard}>
          {vehicleSummary}
          <section className={styles.price} id="booking-price" aria-labelledby="price-title">
            <h2 id="price-title">{t("Стоимость поездки")}</h2>
            <div aria-live="polite">
              {quoteState.status === "idle" ? (
                <p className={styles.caption}>{t("Укажите даты поездки и нажмите «Check price», чтобы узнать стоимость и доступность.")}</p>
              ) : null}
              {quoteState.status === "loading" && quoteIsCurrent ? (
                <p className={styles.caption}>{t("Checking…")}</p>
              ) : null}
              {quoteState.status === "error" && quoteIsCurrent ? (
                <p className="status-message status-error">
                  {t.error(quoteState.failure.message)}{" "}
                  {quoteState.failure.requiresSignIn ? (
                    <Link href={loginHref}>{t("Sign in")}</Link>
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
                    {quoteState.result.available ? t("Available") : t("Not available")}
                  </h3>
                  <QuoteSummary quote={quoteState.result.quote} />
                </section>
              ) : null}
              {quoteState.status === "ready" && !quoteIsCurrent ? (
                <p className="status-message">
                  {t("Dates changed. Check the price again.")}</p>
              ) : null}
            </div>
          </section>
        </Card>
      </aside>
    </form>
  );
}
