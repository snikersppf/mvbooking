import { BOOKING_CONFIG } from "@/server/config/booking";
import {
  assertValidBookingInterval,
  type BookingInterval,
} from "@/server/services/booking/dates";

export function bookingIntervalsOverlap(
  first: BookingInterval,
  second: BookingInterval,
): boolean {
  assertValidBookingInterval(first);
  assertValidBookingInterval(second);

  const bufferMs = BOOKING_CONFIG.availabilityBufferMs;

  return (
    first.startDate.getTime() < second.endDate.getTime() + bufferMs &&
    second.startDate.getTime() < first.endDate.getTime() + bufferMs
  );
}
