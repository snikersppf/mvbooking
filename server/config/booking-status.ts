import { BookingStatus } from "@prisma/client";

export const MANAGER_BOOKING_TRANSITIONS: Readonly<
  Record<BookingStatus, readonly BookingStatus[]>
> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.REJECTED]: [],
};

