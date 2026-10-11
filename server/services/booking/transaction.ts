import { setTimeout as delay } from "node:timers/promises";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  isRetryableBookingTransactionError,
  mapBookingPersistenceError,
} from "@/server/services/booking/persistence-errors";
import { BookingServiceError } from "@/server/services/booking/service-errors";

export const MAX_BOOKING_TRANSACTION_RETRIES = 3;

export type BookingTransactionRuntime = Readonly<{
  sleep: (milliseconds: number) => Promise<void>;
  random: () => number;
}>;

const defaultRuntime: BookingTransactionRuntime = {
  sleep: async (milliseconds) => delay(milliseconds),
  random: Math.random,
};

function retryDelayMilliseconds(retryNumber: number, random: number): number {
  const baseDelay = 20 * 2 ** (retryNumber - 1);
  return baseDelay + Math.floor(baseDelay * random);
}

export async function runBookingTransaction<T>(
  prisma: PrismaClient,
  requestId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  runtime: BookingTransactionRuntime = defaultRuntime,
): Promise<T> {
  let retries = 0;

  for (;;) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5_000,
        timeout: 5_000,
      });
    } catch (error) {
      if (error instanceof BookingServiceError) throw error;

      if (isRetryableBookingTransactionError(error)) {
        if (retries >= MAX_BOOKING_TRANSACTION_RETRIES) {
          throw new BookingServiceError(
            "BOOKING_TEMPORARILY_UNAVAILABLE",
            503,
            "Booking transaction could not be completed after retries.",
            requestId,
          );
        }

        retries += 1;
        await runtime.sleep(
          retryDelayMilliseconds(retries, runtime.random()),
        );
        continue;
      }

      throw mapBookingPersistenceError(error, requestId);
    }
  }
}
