import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  Prisma,
  UserStatus,
  VehicleStatus,
} from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { authorizeCredentials } from "@/server/auth/credentials";
import type { NotificationInput } from "@/server/integrations/notification";
import { verifyPassword } from "@/server/security/password";
import { cancelExpiredPendingBookings } from "@/server/services/booking/cancel-expired-bookings";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "@/server/services/users/password-reset";
import { processNextNotification } from "@/server/services/notifications/worker";
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
  await prisma.notification.deleteMany({ where: { OR: [
    { userId: { startsWith: prefix } },
    { payload: { path: ["resetEmail"], equals: `${prefix}@example.test` } },
  ] } });
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
  it("production reset email link changes credentials and cannot be reused", async () => {
    const prefix = newPrefix();
    const user = await prisma.user.create({ data: {
      id: `${prefix}_reset_user`, name: "Reset customer", email: `${prefix}@example.test`,
    } });
    const messages: NotificationInput[] = [];
    await requestPasswordReset({ email: user.email }, {
      prisma, production: true, appOrigin: "https://booking.example",
    });
    const queued = await prisma.notification.findFirstOrThrow({ where: { payload: { path: ["resetEmail"], equals: user.email } } });
    // Only this fixture is eligible, leaving unrelated queue rows untouched.
    const clock = new Date("2000-01-01T00:00:00Z");
    await prisma.notification.update({ where: { id: queued.id }, data: { nextAttemptAt: clock, createdAt: clock } });
    await processNextNotification(prisma, {
      appOrigin: "https://booking.example", managerChatId: "unused",
      authSecret: "test-only-reset-worker-secret-at-least-32-bytes",
      email: { send: async (input) => {
        messages.push(input);
        return { channel: "email", status: "sent", messageId: "test-email" };
      } },
      telegram: { send: async () => { throw new Error("Reset must not reach Telegram"); } },
    }, () => clock);
    expect(messages).toHaveLength(1);
    const link = messages[0]!.message.split("\n").find((line) => line.startsWith("https://"));
    expect(link).toBeDefined();
    const token = new URL(link!).searchParams.get("token");
    expect(token).toBeTruthy();
    await confirmPasswordReset({ token, password: "new-production-flow-password" }, { prisma, now: () => clock });
    const loggedIn = await authorizeCredentials({ email: user.email, password: "new-production-flow-password" }, new Request("https://booking.example/api/auth/callback/credentials"), {
      repository: {
        findCredentialsUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
        findAuthorizationUserById: (id) => prisma.user.findUnique({ where: { id } }),
        createCustomer: async () => { throw new Error("Not used in this test"); },
      },
      passwordVerifier: verifyPassword,
      rateLimiter: { check: async () => undefined }, authSecret: "test-only-secret-value-at-least-32-bytes",
      trustProxy: false, connectionAddress: "127.0.0.1",
    });
    expect(loggedIn).toBeNull(); // Customer sign-in is intentionally disabled.
    expect(await verifyPassword("new-production-flow-password", (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash!)).toBe(true);
    await expect(confirmPasswordReset({ token, password: "second-password-must-fail" }, { prisma }))
      .rejects.toMatchObject({ code: "RESET_TOKEN_INVALID" });
  });

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
