import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  NotificationType,
  PaymentStatus,
  type Booking,
  type PrismaClient,
} from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import { bookingEventRepository } from "@/server/repositories/booking-events";
import { bookingRepository } from "@/server/repositories/bookings";
import { lockUserById } from "@/server/repositories/users";
import { vehicleRepository } from "@/server/repositories/vehicles";
import { assertActiveLockedUser } from "@/server/services/booking/authorization";
import { BookingServiceError } from "@/server/services/booking/service-errors";
import {
  runBookingTransaction,
  type BookingTransactionRuntime,
} from "@/server/services/booking/transaction";

export type CancelBookingCommand = Readonly<{
  userId: string;
  expectedSessionVersion: number;
  bookingId: string;
  requestId?: string;
}>;

export type CancelBookingDependencies = Readonly<{
  prisma?: PrismaClient;
  requestId?: () => string;
  transactionRuntime?: BookingTransactionRuntime;
}>;

export async function cancelOwnPendingBooking(
  command: CancelBookingCommand,
  dependencies: CancelBookingDependencies = {},
): Promise<Booking> {
  const requestId =
    command.requestId ?? dependencies.requestId?.() ?? randomUUID();
  const prisma = dependencies.prisma ?? getPrismaClient();

  return runBookingTransaction(
    prisma,
    requestId,
    async (transaction) => {
      const user = await lockUserById(transaction, command.userId);
      assertActiveLockedUser(
        user,
        command.expectedSessionVersion,
        requestId,
      );

      // This read discovers the vehicle id but does not acquire a row lock.
      const bookingReference = await bookingRepository.findById(
        transaction,
        command.bookingId,
      );
      if (!bookingReference) {
        throw new BookingServiceError(
          "BOOKING_NOT_FOUND",
          404,
          "Booking was not found.",
          requestId,
        );
      }

      const vehicle = await vehicleRepository.lockById(
        transaction,
        bookingReference.vehicleId,
      );
      if (!vehicle) {
        throw new BookingServiceError(
          "BOOKING_CONFIGURATION_ERROR",
          500,
          "Booking vehicle was not found.",
          requestId,
        );
      }

      const booking = await bookingRepository.lockById(
        transaction,
        command.bookingId,
      );
      if (!booking || booking.vehicleId !== vehicle.id) {
        throw new BookingServiceError(
          "BOOKING_NOT_FOUND",
          404,
          "Booking was not found.",
          requestId,
        );
      }
      if (booking.userId !== command.userId) {
        throw new BookingServiceError(
          "BOOKING_FORBIDDEN",
          403,
          "A customer can cancel only their own booking.",
          requestId,
        );
      }
      if (
        booking.status !== BookingStatus.PENDING ||
        booking.paymentStatus !== PaymentStatus.UNPAID
      ) {
        throw new BookingServiceError(
          "BOOKING_CANNOT_BE_CANCELLED",
          409,
          "Only an unpaid pending booking can be cancelled by its customer.",
          requestId,
        );
      }

      const cancelled = await bookingRepository.updateStatus(
        transaction,
        booking.id,
        BookingStatus.CANCELLED,
      );
      await bookingEventRepository.createAudit(transaction, {
        userId: command.userId,
        action: "BOOKING_CANCELLED",
        bookingId: booking.id,
        metadata: {
          requestId,
          previousStatus: booking.status,
          status: cancelled.status,
          actor: "customer",
        },
      });
      await bookingEventRepository.createNotification(transaction, {
        userId: booking.userId,
        bookingId: booking.id,
        type: NotificationType.BOOKING_CANCELLED,
        eventKey: `booking:${booking.id}:cancelled`,
        payload: {
          provider: "mock",
          bookingId: booking.id,
          status: cancelled.status,
        },
      });

      return cancelled;
    },
    dependencies.transactionRuntime,
  );
}
