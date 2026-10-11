import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  inspectPrismaDatabaseError,
  mapBookingPersistenceError,
} from "@/server/services/booking/persistence-errors";
import { BookingServiceError } from "@/server/services/booking/service-errors";
import { runBookingTransaction } from "@/server/services/booking/transaction";

function prismaError(
  prismaCode: string,
  options: { sqlState?: string; constraint?: string } = {},
): unknown {
  const constraintMessage = options.constraint
    ? ` violates exclusion constraint "${options.constraint}"`
    : "";
  return {
    code: prismaCode,
    message: `Database error.${constraintMessage}`,
    meta: {
      driverAdapterError: {
        cause: {
          kind: "postgres",
          originalCode: options.sqlState,
          originalMessage: `Database error.${constraintMessage}`,
          code: options.sqlState,
          message: `Database error.${constraintMessage}`,
        },
      },
    },
  };
}

function prismaWithTransaction(
  transaction: ReturnType<typeof vi.fn>,
): PrismaClient {
  return { $transaction: transaction } as unknown as PrismaClient;
}

describe("booking transaction retries", () => {
  it("retries P2034 three times with jitter and then succeeds", async () => {
    const transaction = vi
      .fn()
      .mockRejectedValueOnce(prismaError("P2034"))
      .mockRejectedValueOnce(prismaError("P2034"))
      .mockRejectedValueOnce(prismaError("P2034"))
      .mockResolvedValueOnce("created");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      runBookingTransaction(
        prismaWithTransaction(transaction),
        "request-retry",
        vi.fn(),
        { sleep, random: () => 0.5 },
      ),
    ).resolves.toBe("created");

    expect(transaction).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenNthCalledWith(1, 30);
    expect(sleep).toHaveBeenNthCalledWith(2, 60);
    expect(sleep).toHaveBeenNthCalledWith(3, 120);
    expect(transaction.mock.calls[0]?.[1]).toMatchObject({
      isolationLevel: "ReadCommitted",
    });
  });

  it("returns a stable 503 error after retry exhaustion", async () => {
    const transaction = vi.fn().mockRejectedValue(prismaError("P2034"));

    await expect(
      runBookingTransaction(
        prismaWithTransaction(transaction),
        "stable-request-id",
        vi.fn(),
        { sleep: vi.fn().mockResolvedValue(undefined), random: () => 0 },
      ),
    ).rejects.toMatchObject({
      code: "BOOKING_TEMPORARILY_UNAVAILABLE",
      status: 503,
      requestId: "stable-request-id",
    });

    expect(transaction).toHaveBeenCalledTimes(4);
  });

  it("also retries raw 40001/40P01 SQLSTATE values", async () => {
    for (const sqlState of ["40001", "40P01"]) {
      const transaction = vi
        .fn()
        .mockRejectedValueOnce(prismaError("P2039", { sqlState }))
        .mockResolvedValueOnce("ok");

      await expect(
        runBookingTransaction(
          prismaWithTransaction(transaction),
          `request-${sqlState}`,
          vi.fn(),
          { sleep: vi.fn().mockResolvedValue(undefined), random: () => 0 },
        ),
      ).resolves.toBe("ok");
    }
  });

  it("maps only the named 23P01 overlap constraint to a 409", () => {
    const overlap = prismaError("P2039", {
      sqlState: "23P01",
      constraint: "booking_no_active_overlap",
    });
    const unrelated = prismaError("P2039", {
      sqlState: "23P01",
      constraint: "another_exclusion_constraint",
    });

    expect(inspectPrismaDatabaseError(overlap)).toMatchObject({
      prismaCode: "P2039",
      sqlState: "23P01",
      constraintName: "booking_no_active_overlap",
    });
    expect(mapBookingPersistenceError(overlap, "request-overlap")).toEqual(
      expect.objectContaining({
        code: "VEHICLE_UNAVAILABLE",
        status: 409,
      }),
    );
    expect(mapBookingPersistenceError(unrelated, "request-other")).toBe(
      unrelated,
    );
  });

  it("does not mask unrelated errors", async () => {
    const original = new Error("unexpected database failure");
    const transaction = vi.fn().mockRejectedValue(original);

    await expect(
      runBookingTransaction(
        prismaWithTransaction(transaction),
        "request-unexpected",
        vi.fn(),
      ),
    ).rejects.toBe(original);
    expect(original).not.toBeInstanceOf(BookingServiceError);
  });
});
