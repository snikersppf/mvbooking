import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  NotificationChannel,
  PaymentStatus,
  Prisma,
  UserRole,
  UserStatus,
  VehicleStatus,
} from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { cancelOwnPendingBooking } from "@/server/services/booking/cancel-booking";
import { changeBookingStatusByManager } from "@/server/services/booking/change-booking-status";
import {
  createBooking,
  type CreateBookingCommand,
} from "@/server/services/booking/create-booking";
import {
  inspectPrismaDatabaseError,
  mapBookingPersistenceError,
} from "@/server/services/booking/persistence-errors";
import { BookingServiceError } from "@/server/services/booking/service-errors";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const DAY_MS = 24 * 60 * 60 * 1000;
const prisma = createPrismaClient(requireTestDatabaseUrl());
const prefixes: string[] = [];

function newPrefix(): string {
  const prefix = `it_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  prefixes.push(prefix);
  return prefix;
}

function futureInterval(
  offsetDays: number,
  durationDays = 1,
): { startDate: Date; endDate: Date } {
  const startDate = new Date(Date.now() + offsetDays * DAY_MS);
  startDate.setUTCMilliseconds(0);
  const endDate = new Date(startDate.getTime() + durationDays * DAY_MS);
  return { startDate, endDate };
}

async function createUser(
  prefix: string,
  label: string,
  options: { role?: UserRole; status?: UserStatus } = {},
) {
  const id = `${prefix}_user_${label}`;
  return prisma.user.create({
    data: {
      id,
      name: `Integration ${label}`,
      email: `${id}@example.test`,
      role: options.role ?? UserRole.CUSTOMER,
      status: options.status ?? UserStatus.ACTIVE,
      sessionVersion: 0,
    },
  });
}

async function createVehicle(prefix: string, label = "car") {
  const id = `${prefix}_vehicle_${label}`;
  const vehicle = await prisma.vehicle.create({
    data: {
      id,
      slug: `${prefix}-${label}`,
      brand: "Toyota",
      model: "RAV4",
      year: 2025,
      category: "SUV",
      seats: 5,
      transmission: "AUTOMATIC",
      fuel: "PETROL",
      drive: "AWD",
      depositAmount: new Prisma.Decimal("300.00"),
      currency: "GEL",
      insuranceIncluded: true,
      status: VehicleStatus.AVAILABLE,
      location: "Tbilisi",
    },
  });

  await prisma.pricingRule.createMany({
    data: [
      {
        id: `${prefix}_${label}_price_1`,
        vehicleId: id,
        minDays: 1,
        maxDays: 2,
        pricePerDay: new Prisma.Decimal("100.00"),
        currency: "GEL",
      },
      {
        id: `${prefix}_${label}_price_2`,
        vehicleId: id,
        minDays: 3,
        maxDays: 6,
        pricePerDay: new Prisma.Decimal("90.00"),
        currency: "GEL",
      },
      {
        id: `${prefix}_${label}_price_3`,
        vehicleId: id,
        minDays: 7,
        maxDays: 14,
        pricePerDay: new Prisma.Decimal("80.00"),
        currency: "GEL",
      },
      {
        id: `${prefix}_${label}_price_4`,
        vehicleId: id,
        minDays: 15,
        maxDays: null,
        pricePerDay: new Prisma.Decimal("70.00"),
        currency: "GEL",
      },
    ],
  });

  return vehicle;
}

function createCommand(
  userId: string,
  vehicleId: string,
  interval: { startDate: Date; endDate: Date },
  options: {
    idempotencyKey?: string;
    returnLocation?: string;
    requestId?: string;
  } = {},
): CreateBookingCommand {
  return {
    userId,
    expectedSessionVersion: 0,
    idempotencyKey: options.idempotencyKey,
    requestId: options.requestId ?? randomUUID(),
    booking: {
      vehicleId,
      startDate: interval.startDate.toISOString(),
      endDate: interval.endDate.toISOString(),
      pickupLocation: "Tbilisi Airport",
      returnLocation: options.returnLocation ?? "Tbilisi Airport",
      customerComment: "Integration test booking",
    },
  };
}

async function captureServiceError(
  promise: Promise<unknown>,
): Promise<BookingServiceError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(BookingServiceError);
    return error as BookingServiceError;
  }
  throw new Error("Expected BookingServiceError, but the operation succeeded.");
}

async function cleanup(prefix: string): Promise<void> {
  await prisma.notification.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.auditLog.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.booking.deleteMany({
    where: {
      OR: [
        { userId: { startsWith: prefix } },
        { vehicleId: { startsWith: prefix } },
      ],
    },
  });
  await prisma.pricingRule.deleteMany({
    where: { vehicleId: { startsWith: prefix } },
  });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  await cleanupTrackedPrefixes(prefixes, cleanup);
});

afterAll(async () => {
  try {
    await cleanupTrackedPrefixes(prefixes, cleanup);
  } finally {
    await prisma.$disconnect();
  }
});

describe("booking service integration", () => {
  it("creates a booking with the selected price snapshot and transactional outbox", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "customer");
    const vehicle = await createVehicle(prefix);
    const interval = futureInterval(30, 3);

    const result = await createBooking(
      createCommand(user.id, vehicle.id, interval),
      { prisma },
    );

    expect(result.replayed).toBe(false);
    expect(result.booking.totalDays).toBe(3);
    expect(result.booking.pricePerDay.toFixed(2)).toBe("90.00");
    expect(result.booking.totalAmount.toFixed(2)).toBe("270.00");
    expect(result.booking.depositAmount.toFixed(2)).toBe("300.00");
    expect(result.totalDue.toFixed(2)).toBe("570.00");

    await prisma.pricingRule.update({
      where: {
        vehicleId_minDays: { vehicleId: vehicle.id, minDays: 3 },
      },
      data: { pricePerDay: new Prisma.Decimal("50.00") },
    });
    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: result.booking.id },
    });
    expect(stored.pricePerDay.toFixed(2)).toBe("90.00");
    expect(stored.totalAmount.toFixed(2)).toBe("270.00");

    await expect(
      prisma.auditLog.count({
        where: { entity: "Booking", entityId: stored.id },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.notification.findUniqueOrThrow({
        where: { eventKey: `booking:${stored.id}:created` },
      }),
    ).resolves.toMatchObject({
      channel: NotificationChannel.EMAIL,
      payload: expect.objectContaining({ provider: "mock" }),
    });
  });

  it("allows only one of two parallel overlapping requests", async () => {
    const prefix = newPrefix();
    const firstUser = await createUser(prefix, "first");
    const secondUser = await createUser(prefix, "second");
    const vehicle = await createVehicle(prefix);
    const interval = futureInterval(40, 2);

    const results = await Promise.allSettled([
      createBooking(createCommand(firstUser.id, vehicle.id, interval), {
        prisma,
      }),
      createBooking(createCommand(secondUser.id, vehicle.id, interval), {
        prisma,
      }),
    ]);
    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result) => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: "VEHICLE_UNAVAILABLE",
      status: 409,
    });
    await expect(
      prisma.booking.count({
        where: { vehicleId: vehicle.id, status: BookingStatus.PENDING },
      }),
    ).resolves.toBe(1);
  });

  it("allows adjacent intervals and releases a cancelled interval", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "customer");
    const vehicle = await createVehicle(prefix);
    const firstInterval = futureInterval(50, 1);
    const adjacentInterval = {
      startDate: firstInterval.endDate,
      endDate: new Date(firstInterval.endDate.getTime() + DAY_MS),
    };

    const first = await createBooking(
      createCommand(user.id, vehicle.id, firstInterval),
      { prisma },
    );
    await expect(
      createBooking(createCommand(user.id, vehicle.id, adjacentInterval), {
        prisma,
      }),
    ).resolves.toMatchObject({ replayed: false });

    await expect(
      cancelOwnPendingBooking(
        {
          userId: user.id,
          expectedSessionVersion: 0,
          bookingId: first.booking.id,
        },
        { prisma },
      ),
    ).resolves.toMatchObject({ status: BookingStatus.CANCELLED });
    await expect(
      createBooking(createCommand(user.id, vehicle.id, firstInterval), {
        prisma,
      }),
    ).resolves.toMatchObject({ replayed: false });
  });

  it("enforces at most three active PENDING bookings per user", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "customer");
    const vehicle = await createVehicle(prefix);
    const initial = futureInterval(60, 1);

    for (let index = 0; index < 3; index += 1) {
      const startDate = new Date(initial.startDate.getTime() + index * DAY_MS);
      await createBooking(
        createCommand(user.id, vehicle.id, {
          startDate,
          endDate: new Date(startDate.getTime() + DAY_MS),
        }),
        { prisma },
      );
    }

    const fourthStart = new Date(initial.startDate.getTime() + 3 * DAY_MS);
    const error = await captureServiceError(
      createBooking(
        createCommand(user.id, vehicle.id, {
          startDate: fourthStart,
          endDate: new Date(fourthStart.getTime() + DAY_MS),
        }),
        { prisma },
      ),
    );
    expect(error).toMatchObject({
      code: "PENDING_BOOKING_LIMIT_REACHED",
      status: 409,
    });
  });

  it("replays the same idempotent request and rejects a changed payload", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "customer");
    const vehicle = await createVehicle(prefix);
    const interval = futureInterval(70, 2);
    const command = createCommand(user.id, vehicle.id, interval, {
      idempotencyKey: "integration-idempotency-key",
    });

    const first = await createBooking(command, { prisma });
    const replay = await createBooking(command, { prisma });

    expect(replay.replayed).toBe(true);
    expect(replay.booking.id).toBe(first.booking.id);
    expect(replay.booking.requestHash).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      prisma.booking.count({
        where: {
          userId: user.id,
          idempotencyKey: "integration-idempotency-key",
        },
      }),
    ).resolves.toBe(1);

    const error = await captureServiceError(
      createBooking(
        createCommand(user.id, vehicle.id, interval, {
          idempotencyKey: "integration-idempotency-key",
          returnLocation: "Batumi",
        }),
        { prisma },
      ),
    );
    expect(error).toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED",
      status: 409,
    });
  });

  it("does not let a customer cancel another user's booking", async () => {
    const prefix = newPrefix();
    const owner = await createUser(prefix, "owner");
    const other = await createUser(prefix, "other");
    const vehicle = await createVehicle(prefix);
    const created = await createBooking(
      createCommand(owner.id, vehicle.id, futureInterval(80)),
      { prisma },
    );

    const error = await captureServiceError(
      cancelOwnPendingBooking(
        {
          userId: other.id,
          expectedSessionVersion: 0,
          bookingId: created.booking.id,
        },
        { prisma },
      ),
    );
    expect(error).toMatchObject({ code: "BOOKING_FORBIDDEN", status: 403 });
    await expect(
      prisma.booking.findUniqueOrThrow({
        where: { id: created.booking.id },
      }),
    ).resolves.toMatchObject({ status: BookingStatus.PENDING });
  });

  it("applies the manager transition table and rejects invalid transitions", async () => {
    const prefix = newPrefix();
    const customer = await createUser(prefix, "customer");
    const manager = await createUser(prefix, "manager", {
      role: UserRole.MANAGER,
    });
    const vehicle = await createVehicle(prefix);
    const created = await createBooking(
      createCommand(customer.id, vehicle.id, futureInterval(90, 2)),
      { prisma },
    );

    const confirmed = await changeBookingStatusByManager(
      {
        actorUserId: manager.id,
        expectedSessionVersion: 0,
        bookingId: created.booking.id,
        status: BookingStatus.CONFIRMED,
        managerComment: " Confirmed in integration test ",
      },
      { prisma },
    );
    expect(confirmed).toMatchObject({
      status: BookingStatus.CONFIRMED,
      managerComment: "Confirmed in integration test",
    });

    const rejectedError = await captureServiceError(
      changeBookingStatusByManager(
        {
          actorUserId: manager.id,
          expectedSessionVersion: 0,
          bookingId: created.booking.id,
          status: BookingStatus.REJECTED,
        },
        { prisma },
      ),
    );
    expect(rejectedError.code).toBe("INVALID_BOOKING_TRANSITION");

    const completedEarlyError = await captureServiceError(
      changeBookingStatusByManager(
        {
          actorUserId: manager.id,
          expectedSessionVersion: 0,
          bookingId: created.booking.id,
          status: BookingStatus.COMPLETED,
        },
        { prisma },
      ),
    );
    expect(completedEarlyError.code).toBe("INVALID_BOOKING_TRANSITION");
  });

  it("does not create a booking for a blocked user", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "blocked", {
      status: UserStatus.SUSPENDED,
    });
    const vehicle = await createVehicle(prefix);

    const error = await captureServiceError(
      createBooking(
        createCommand(user.id, vehicle.id, futureInterval(100)),
        { prisma },
      ),
    );
    expect(error).toMatchObject({ code: "USER_NOT_ACTIVE", status: 403 });
    await expect(
      prisma.booking.count({ where: { userId: user.id } }),
    ).resolves.toBe(0);
  });

  it("captures the real Prisma 7 adapter-pg exclusion error shape", async () => {
    const prefix = newPrefix();
    const firstUser = await createUser(prefix, "first");
    const secondUser = await createUser(prefix, "second");
    const vehicle = await createVehicle(prefix);
    const interval = futureInterval(110, 1);
    await createBooking(
      createCommand(firstUser.id, vehicle.id, interval),
      { prisma },
    );

    let databaseError: unknown;
    try {
      await prisma.booking.create({
        data: {
          userId: secondUser.id,
          vehicleId: vehicle.id,
          startDate: interval.startDate,
          endDate: interval.endDate,
          pickupLocation: "Tbilisi Airport",
          returnLocation: "Tbilisi Airport",
          totalDays: 1,
          pricePerDay: new Prisma.Decimal("100.00"),
          totalAmount: new Prisma.Decimal("100.00"),
          depositAmount: new Prisma.Decimal("300.00"),
          currency: "GEL",
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
        },
      });
    } catch (error) {
      databaseError = error;
    }

    expect(databaseError).toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect(inspectPrismaDatabaseError(databaseError)).toMatchObject({
      prismaCode: "P2039",
      sqlState: "23P01",
      constraintName: "booking_no_active_overlap",
    });
    expect(
      mapBookingPersistenceError(databaseError, "integration-overlap"),
    ).toEqual(
      expect.objectContaining({
        code: "VEHICLE_UNAVAILABLE",
        status: 409,
      }),
    );
  });
});
