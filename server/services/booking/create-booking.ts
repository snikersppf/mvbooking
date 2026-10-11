import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  NotificationType,
  PaymentStatus,
  VehicleStatus,
  type Booking,
  type PrismaClient,
} from "@prisma/client";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { getPrismaClient } from "@/server/db/prisma";
import { bookingEventRepository } from "@/server/repositories/booking-events";
import { bookingRepository } from "@/server/repositories/bookings";
import { pricingRuleRepository } from "@/server/repositories/pricing-rules";
import { lockUserById } from "@/server/repositories/users";
import { vehicleRepository } from "@/server/repositories/vehicles";
import { assertActiveLockedUser } from "@/server/services/booking/authorization";
import { calculateBookingDays } from "@/server/services/booking/dates";
import { calculateBookingMoney } from "@/server/services/booking/money";
import { isBookingIdempotencyUniqueError } from "@/server/services/booking/persistence-errors";
import { selectPricingTier } from "@/server/services/booking/pricing";
import { createBookingRequestHash } from "@/server/services/booking/request-hash";
import { BookingServiceError } from "@/server/services/booking/service-errors";
import {
  runBookingTransaction,
  type BookingTransactionRuntime,
} from "@/server/services/booking/transaction";
import {
  createBookingInputSchema,
  type CreateBookingInput,
} from "@/server/validators/booking";

const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

export type CreateBookingCommand = Readonly<{
  userId: string;
  expectedSessionVersion: number;
  booking: unknown;
  idempotencyKey?: string | null;
  requestId?: string;
}>;

export type CreateBookingResult = Readonly<{
  booking: Booking;
  totalDue: Booking["totalAmount"];
  replayed: boolean;
}>;

export type CreateBookingDependencies = Readonly<{
  prisma?: PrismaClient;
  now?: () => Date;
  requestId?: () => string;
  transactionRuntime?: BookingTransactionRuntime;
}>;

function normalizeIdempotencyKey(
  value: string | null | undefined,
  requestId: string,
): string | null {
  if (value === null || value === undefined) return null;

  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > IDEMPOTENCY_KEY_MAX_LENGTH
  ) {
    throw new BookingServiceError(
      "IDEMPOTENCY_KEY_INVALID",
      400,
      "Idempotency key must contain between 1 and 128 characters.",
      requestId,
    );
  }

  return normalized;
}

function resultFromBooking(
  booking: Booking,
  replayed: boolean,
): CreateBookingResult {
  return {
    booking,
    totalDue: booking.totalAmount.plus(booking.depositAmount),
    replayed,
  };
}

function resolveIdempotentBooking(
  existing: Booking,
  requestHash: string,
  requestId: string,
): CreateBookingResult {
  if (existing.requestHash !== requestHash) {
    throw new BookingServiceError(
      "IDEMPOTENCY_KEY_REUSED",
      409,
      "Idempotency key was already used with a different request.",
      requestId,
    );
  }

  return resultFromBooking(existing, true);
}

async function createBookingInTransaction(
  prisma: PrismaClient,
  command: CreateBookingCommand,
  input: CreateBookingInput,
  idempotencyKey: string | null,
  requestHash: string | null,
  requestId: string,
  now: () => Date,
  runtime?: BookingTransactionRuntime,
): Promise<CreateBookingResult> {
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

      if (idempotencyKey && requestHash) {
        const existing = await bookingRepository.findByIdempotencyKey(
          transaction,
          command.userId,
          idempotencyKey,
        );
        if (existing) {
          return resolveIdempotentBooking(existing, requestHash, requestId);
        }
      }

      const vehicle = await vehicleRepository.lockById(
        transaction,
        input.vehicleId,
      );
      if (!vehicle) {
        throw new BookingServiceError(
          "VEHICLE_NOT_FOUND",
          404,
          "Vehicle was not found.",
          requestId,
        );
      }
      if (vehicle.status !== VehicleStatus.AVAILABLE) {
        throw new BookingServiceError(
          "VEHICLE_UNAVAILABLE",
          409,
          "Only an available vehicle can be booked.",
          requestId,
        );
      }

      const pricingRules = await pricingRuleRepository.findByVehicleId(
        transaction,
        vehicle.id,
      );
      const totalDays = calculateBookingDays(
        { startDate: input.startDate, endDate: input.endDate },
        now(),
      );
      const pricingRule = selectPricingTier(totalDays, pricingRules);

      if (
        vehicle.currency !== "GEL" ||
        pricingRule.currency !== vehicle.currency
      ) {
        throw new BookingServiceError(
          "BOOKING_CONFIGURATION_ERROR",
          500,
          "Vehicle and pricing currencies are inconsistent.",
          requestId,
        );
      }

      const pendingCount = await bookingRepository.countPendingByUser(
        transaction,
        command.userId,
      );
      if (pendingCount >= BOOKING_CONFIG.maxActivePendingPerUser) {
        throw new BookingServiceError(
          "PENDING_BOOKING_LIMIT_REACHED",
          409,
          "Active pending booking limit has been reached.",
          requestId,
        );
      }

      const overlaps = await bookingRepository.lockActiveOverlaps(
        transaction,
        vehicle.id,
        input.startDate,
        input.endDate,
      );
      if (overlaps.length > 0) {
        throw new BookingServiceError(
          "VEHICLE_UNAVAILABLE",
          409,
          "Vehicle is unavailable for the requested interval.",
          requestId,
        );
      }

      const money = calculateBookingMoney({
        pricePerDay: pricingRule.pricePerDay,
        totalDays,
        depositAmount: vehicle.depositAmount,
      });
      const booking = await bookingRepository.create(transaction, {
        userId: command.userId,
        vehicleId: vehicle.id,
        startDate: input.startDate,
        endDate: input.endDate,
        pickupLocation: input.pickupLocation,
        returnLocation: input.returnLocation,
        totalDays,
        pricePerDay: money.pricePerDay,
        totalAmount: money.totalAmount,
        depositAmount: money.depositAmount,
        currency: vehicle.currency,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        idempotencyKey,
        requestHash,
        customerComment: input.customerComment,
      });

      await bookingEventRepository.createAudit(transaction, {
        userId: command.userId,
        action: "BOOKING_CREATED",
        bookingId: booking.id,
        metadata: {
          requestId,
          totalDays,
          pricePerDay: money.pricePerDay.toFixed(2),
          totalAmount: money.totalAmount.toFixed(2),
        },
      });
      await bookingEventRepository.createNotification(transaction, {
        userId: command.userId,
        bookingId: booking.id,
        type: NotificationType.BOOKING_CREATED,
        eventKey: `booking:${booking.id}:created`,
        payload: {
          provider: "mock",
          bookingId: booking.id,
          status: booking.status,
        },
      });

      return resultFromBooking(booking, false);
    },
    runtime,
  );
}

export async function createBooking(
  command: CreateBookingCommand,
  dependencies: CreateBookingDependencies = {},
): Promise<CreateBookingResult> {
  const requestId =
    command.requestId ?? dependencies.requestId?.() ?? randomUUID();
  const input = createBookingInputSchema.parse(command.booking);
  const idempotencyKey = normalizeIdempotencyKey(
    command.idempotencyKey,
    requestId,
  );
  const requestHash = idempotencyKey
    ? createBookingRequestHash(command.userId, input)
    : null;
  const prisma = dependencies.prisma ?? getPrismaClient();
  const now = dependencies.now ?? (() => new Date());

  try {
    return await createBookingInTransaction(
      prisma,
      command,
      input,
      idempotencyKey,
      requestHash,
      requestId,
      now,
      dependencies.transactionRuntime,
    );
  } catch (error) {
    if (
      !idempotencyKey ||
      !requestHash ||
      !isBookingIdempotencyUniqueError(error)
    ) {
      throw error;
    }

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
        const existing = await bookingRepository.findByIdempotencyKey(
          transaction,
          command.userId,
          idempotencyKey,
        );
        if (!existing) throw error;
        return resolveIdempotentBooking(existing, requestHash, requestId);
      },
      dependencies.transactionRuntime,
    );
  }
}
