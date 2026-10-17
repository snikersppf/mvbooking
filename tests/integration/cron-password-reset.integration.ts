import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  Prisma,
  UserStatus,
  VehicleStatus,
} from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { verifyPassword } from "@/server/security/password";
import { cancelExpiredPendingBookings } from "@/server/services/booking/cancel-expired-bookings";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "@/server/services/users/password-reset";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const prisma = createPrismaClient(requireTestDatabaseUrl());
const prefixes: string[] = [];

function newPrefix(): string {
  const prefix = `stage7_${randomUUID().replaceAll("-", "").slice(0, 15)}`;
  prefixes.push(prefix);
  return prefix;
}

async function cleanup(prefix: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.booking.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

beforeAll(async () => { await prisma.$connect(); });
afterEach(async () => { await cleanupTrackedPrefixes(prefixes, cleanup); });
afterAll(async () => {
  try {
    await cleanupTrackedPrefixes(prefixes, cleanup);
  } finally {
    await prisma.$disconnect();
  }
});

describe("stage 7 database integration", () => {
  it("expires only old pending bookings and records the system action", async () => {
    const prefix = newPrefix();
    const now = new Date();
    const user = await prisma.user.create({
      data: { id: `${prefix}_user`, name: "Test customer", email: `${prefix}@example.test` },
    });
    const vehicles = await Promise.all(["old", "fresh", "confirmed"].map((name) =>
      prisma.vehicle.create({
        data: {
          id: `${prefix}_${name}`,
          slug: `${prefix}-${name}`,
          brand: "Toyota", model: "RAV4", year: 2025, category: "SUV",
          seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "AWD",
          depositAmount: new Prisma.Decimal("100.00"), currency: "GEL",
          insuranceIncluded: true, status: VehicleStatus.AVAILABLE, location: "Tbilisi",
        },
      }),
    ));
    const bookings = await Promise.all(vehicles.map((vehicle, index) =>
      prisma.booking.create({
        data: {
          id: `${prefix}_booking_${index}`,
          userId: user.id, vehicleId: vehicle.id,
          startDate: new Date(now.getTime() + (30 + index) * 86_400_000),
          endDate: new Date(now.getTime() + (31 + index) * 86_400_000),
          pickupLocation: "Tbilisi", returnLocation: "Tbilisi",
          totalDays: 1, pricePerDay: new Prisma.Decimal("50.00"),
          totalAmount: new Prisma.Decimal("50.00"), depositAmount: new Prisma.Decimal("100.00"),
          currency: "GEL",
          status: index === 2 ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
          createdAt: new Date(now.getTime() - (index === 1 ? 24 : 25) * 3_600_000),
        },
      }),
    ));

    await cancelExpiredPendingBookings(prisma, now);

    const statuses = await Promise.all(bookings.map((booking) =>
      prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, select: { status: true } }),
    ));
    expect(statuses.map((booking) => booking.status)).toEqual([
      BookingStatus.CANCELLED, BookingStatus.PENDING, BookingStatus.CONFIRMED,
    ]);
    expect(await prisma.auditLog.count({
      where: { entity: "Booking", entityId: bookings[0]!.id, action: "BOOKING_EXPIRED" },
    })).toBe(1);
  });

  it("resets a password once and increments sessionVersion", async () => {
    const prefix = newPrefix();
    const token = "a".repeat(43);
    const user = await prisma.user.create({
      data: {
        id: `${prefix}_user`, name: "Test customer", email: `${prefix}@example.test`,
        status: UserStatus.ACTIVE, sessionVersion: 5,
      },
    });
    const logResetLink = vi.fn();
    await requestPasswordReset({ email: user.email }, {
      prisma, createToken: () => token, appOrigin: "https://booking.example",
      production: false, logResetLink,
    });
    expect(logResetLink).toHaveBeenCalledOnce();
    const stored = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).not.toBe(token);

    await confirmPasswordReset({ token, password: "new-secure-password" }, { prisma });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.sessionVersion).toBe(6);
    await expect(verifyPassword("new-secure-password", updated.passwordHash ?? ""))
      .resolves.toBe(true);
    await expect(confirmPasswordReset({ token, password: "another-secure-password" }, { prisma }))
      .rejects.toMatchObject({ code: "RESET_TOKEN_INVALID" });

    await requestPasswordReset({ email: user.email }, {
      prisma, createToken: () => "b".repeat(43), appOrigin: "https://booking.example",
      production: false, logResetLink,
    });
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await expect(confirmPasswordReset({
      token: "b".repeat(43), password: "another-secure-password",
    }, { prisma })).rejects.toMatchObject({ code: "RESET_TOKEN_INVALID" });
  });
});
