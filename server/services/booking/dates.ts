import {
  formatCalendarDateInTimeZone,
  MILLISECONDS_PER_DAY,
} from "@/lib/date-time";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { BookingRuleError } from "@/server/services/booking/errors";

export type BookingInterval = Readonly<{
  startDate: Date;
  endDate: Date;
}>;

function assertValidDate(date: Date): void {
  if (Number.isNaN(date.getTime())) {
    throw new BookingRuleError(
      "INVALID_BOOKING_PERIOD",
      "Booking dates must be valid.",
    );
  }
}

export function assertValidBookingInterval(interval: BookingInterval): void {
  assertValidDate(interval.startDate);
  assertValidDate(interval.endDate);

  if (interval.startDate.getTime() >= interval.endDate.getTime()) {
    throw new BookingRuleError(
      "INVALID_BOOKING_PERIOD",
      "Booking start must be before booking end.",
    );
  }
}

export function calculateBookingDays(
  interval: BookingInterval,
  now: Date = new Date(),
): number {
  assertValidBookingInterval(interval);
  assertValidDate(now);

  const earliestStart = now.getTime() - BOOKING_CONFIG.gracePeriodMs;
  if (interval.startDate.getTime() < earliestStart) {
    throw new BookingRuleError(
      "BOOKING_START_IN_PAST",
      "Booking start must not be in the past.",
    );
  }

  const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
  const totalDays = Math.max(1, Math.ceil(durationMs / MILLISECONDS_PER_DAY));

  if (totalDays > BOOKING_CONFIG.maxDurationDays) {
    throw new BookingRuleError(
      "BOOKING_DURATION_EXCEEDED",
      `Booking duration must not exceed ${BOOKING_CONFIG.maxDurationDays} days.`,
    );
  }

  return totalDays;
}

export function formatBookingCalendarDate(date: Date): string {
  return formatCalendarDateInTimeZone(date, BOOKING_CONFIG.displayTimeZone);
}
