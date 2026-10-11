import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  NotificationType,
  type Booking,
  type PrismaClient,
} from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import { bookingEventRepository } from "@/server/repositories/booking-events";
import { bookingRepository } from "@/server/repositories/bookings";
import { lockUserById } from "@/server/repositories/users";
import { vehicleRepository } from "@/server/repositories/vehicles";
import {
  assertActiveLockedUser,
  assertManagerRole,
} from "@/server/services/booking/authorization";
import { BookingServiceError } from "@/server/services/booking/service-errors";
import {
  runBookingTransaction,
  type BookingTransactionRuntime,
} from "@/server/services/booking/transaction";

const MANAGER_COMMENT_MAX_LENGTH = 2_000;

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

const notificationTypeByStatus: Readonly<
  Record<BookingStatus, NotificationType>
> = {
  [BookingStatus.PENDING]: NotificationType.BOOKING_UPDATED,
  [BookingStatus.CONFIRMED]: NotificationType.BOOKING_CONFIRMED,
  [BookingStatus.CANCELLED]: NotificationType.BOOKING_CANCELLED,
  [BookingStatus.COMPLETED]: NotificationType.BOOKING_UPDATED,
  [BookingStatus.REJECTED]: NotificationType.BOOKING_REJECTED,
};

export type ChangeBookingStatusCommand = Readonly<{
  actorUserId: string;
  expectedSessionVersion: number;
  bookingId: string;
  status: BookingStatus;
  managerComment?: string | null;
  requestId?: string;
}>;

export type ChangeBookingStatusDependencies = Readonly<{
  prisma?: PrismaClient;
  now?: () => Date;
  requestId?: () => string;
  transactionRuntime?: BookingTransactionRuntime;
}>;

function normalizeManagerComment(
  value: string | null | undefined,
  requestId: string,
): string | null | undefined {
  if (value === null || value === undefined) return value;

  const normalized = value.trim();
  if (normalized.length > MANAGER_COMMENT_MAX_LENGTH) {
    throw new BookingServiceError(
      "INVALID_BOOKING_TRANSITION",
      400,
      "Manager comment must not exceed 2000 characters.",
      requestId,
    );
  }

  return normalized || null;
}

function assertTransitionAllowed(
  booking: Booking,
  targetStatus: BookingStatus,
  now: Date,
  requestId: string,
): void {
  if (!MANAGER_BOOKING_TRANSITIONS[booking.status].includes(targetStatus)) {
    throw new BookingServiceError(
      "INVALID_BOOKING_TRANSITION",
      409,
      `Transition from ${booking.status} to ${targetStatus} is not allowed.`,
      requestId,
    );
  }

  if (
    targetStatus === BookingStatus.COMPLETED &&
    now.getTime() < booking.endDate.getTime()
  ) {
    throw new BookingServiceError(
      "INVALID_BOOKING_TRANSITION",
      409,
      "A booking cannot be completed before its end date.",
      requestId,
    );
  }
}

export async function changeBookingStatusByManager(
  command: ChangeBookingStatusCommand,
  dependencies: ChangeBookingStatusDependencies = {},
): Promise<Booking> {
  const requestId =
    command.requestId ?? dependencies.requestId?.() ?? randomUUID();
  const prisma = dependencies.prisma ?? getPrismaClient();
  const now = dependencies.now ?? (() => new Date());
  const managerComment = normalizeManagerComment(
    command.managerComment,
    requestId,
  );

  return runBookingTransaction(
    prisma,
    requestId,
    async (transaction) => {
      const actor = await lockUserById(transaction, command.actorUserId);
      assertActiveLockedUser(
        actor,
        command.expectedSessionVersion,
        requestId,
      );
      assertManagerRole(actor, requestId);

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

      assertTransitionAllowed(booking, command.status, now(), requestId);
      const updated = await bookingRepository.updateStatus(
        transaction,
        booking.id,
        command.status,
        managerComment,
      );
      await bookingEventRepository.createAudit(transaction, {
        userId: command.actorUserId,
        action: "BOOKING_STATUS_CHANGED",
        bookingId: booking.id,
        metadata: {
          requestId,
          previousStatus: booking.status,
          status: updated.status,
          actor: "manager",
        },
      });
      await bookingEventRepository.createNotification(transaction, {
        userId: booking.userId,
        bookingId: booking.id,
        type: notificationTypeByStatus[updated.status],
        eventKey: `booking:${booking.id}:status:${updated.status.toLowerCase()}`,
        payload: {
          provider: "mock",
          bookingId: booking.id,
          status: updated.status,
        },
      });

      return updated;
    },
    dependencies.transactionRuntime,
  );
}
