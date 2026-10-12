import { z } from "zod";
import {
  bookingLocalDateTimeToIso,
  isBookingLocalDateTime,
} from "@/lib/booking-calendar";
import { BOOKING_INPUT_LIMITS } from "@/lib/booking-input";

export type BookingFormSchemaOptions = Readonly<{
  displayTimeZone: string;
  maxDurationDays: number;
  now?: Date;
}>;

export function createBookingFormSchema({
  displayTimeZone,
  maxDurationDays,
  now = new Date(),
}: BookingFormSchemaOptions) {
  const localDateTime = z
    .string()
    .trim()
    .min(1, "Choose a date and time.")
    .refine(
      (value) => isBookingLocalDateTime(value, displayTimeZone),
      "Choose a valid date and time.",
    );

  return z
    .object({
      startDate: localDateTime,
      endDate: localDateTime,
      pickupLocation: z
        .string()
        .trim()
        .min(1, "Enter a pickup location.")
        .max(
          BOOKING_INPUT_LIMITS.location,
          "Use no more than " +
            BOOKING_INPUT_LIMITS.location +
            " characters.",
        ),
      returnLocation: z
        .string()
        .trim()
        .min(1, "Enter a return location.")
        .max(
          BOOKING_INPUT_LIMITS.location,
          "Use no more than " +
            BOOKING_INPUT_LIMITS.location +
            " characters.",
        ),
      customerComment: z
        .string()
        .trim()
        .max(
          BOOKING_INPUT_LIMITS.customerComment,
          "Use no more than " +
            BOOKING_INPUT_LIMITS.customerComment +
            " characters.",
        ),
    })
    .strict()
    .superRefine((values, context) => {
      if (
        !isBookingLocalDateTime(values.startDate, displayTimeZone) ||
        !isBookingLocalDateTime(values.endDate, displayTimeZone)
      ) {
        return;
      }

      const start = new Date(
        bookingLocalDateTimeToIso(values.startDate, displayTimeZone),
      );
      const end = new Date(
        bookingLocalDateTimeToIso(values.endDate, displayTimeZone),
      );

      if (start.getTime() < now.getTime()) {
        context.addIssue({
          code: "custom",
          path: ["startDate"],
          message: "Choose a start time in the future.",
        });
      }
      if (start.getTime() >= end.getTime()) {
        context.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "The return time must be after the pickup time.",
        });
      }
      if (
        end.getTime() - start.getTime() >
        maxDurationDays * 24 * 60 * 60 * 1_000
      ) {
        context.addIssue({
          code: "custom",
          path: ["endDate"],
          message:
            "The rental period cannot exceed " +
            maxDurationDays +
            " days.",
        });
      }
    });
}

export type BookingFormValues = z.infer<
  ReturnType<typeof createBookingFormSchema>
>;

export type CreateBookingPayload = Readonly<{
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  customerComment?: string;
}>;

export type QuoteDateRange = Pick<
  CreateBookingPayload,
  "startDate" | "endDate"
>;

export function toQuoteDateRange(
  values: Pick<BookingFormValues, "startDate" | "endDate">,
  displayTimeZone: string,
): QuoteDateRange {
  return {
    startDate: bookingLocalDateTimeToIso(
      values.startDate,
      displayTimeZone,
    ),
    endDate: bookingLocalDateTimeToIso(values.endDate, displayTimeZone),
  };
}

export function toCreateBookingPayload(
  vehicleId: string,
  values: BookingFormValues,
  displayTimeZone: string,
): CreateBookingPayload {
  const dates = toQuoteDateRange(values, displayTimeZone);
  const customerComment = values.customerComment.trim();

  return {
    vehicleId,
    ...dates,
    pickupLocation: values.pickupLocation.trim(),
    returnLocation: values.returnLocation.trim(),
    ...(customerComment ? { customerComment } : {}),
  };
}

export function quoteInputFingerprint(
  values: Pick<BookingFormValues, "startDate" | "endDate">,
): string {
  return JSON.stringify([
    values.startDate.trim(),
    values.endDate.trim(),
  ]);
}

export function bookingPayloadFingerprint(
  payload: CreateBookingPayload,
): string {
  return JSON.stringify(payload);
}
