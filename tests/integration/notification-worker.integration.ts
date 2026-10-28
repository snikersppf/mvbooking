import { randomUUID } from "node:crypto";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { NotificationDeliveryError } from "@/server/integrations/notification-production";
import { createBooking } from "@/server/services/booking/create-booking";
import { claimNotification, processNextNotification, type NotificationWorkerConfig } from "@/server/services/notifications/worker";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const prisma = createPrismaClient(requireTestDatabaseUrl());
const prefixes: string[] = [];
// Fixed early clock isolates these rows from leftovers without deleting unrelated data.
const now = new Date("2000-01-01T00:00:00Z");
function config(): NotificationWorkerConfig {
  return {
    appOrigin: "https://booking.example", managerChatId: "-100123",
    email: { send: vi.fn().mockResolvedValue({ channel: "email", status: "sent", messageId: "email-1" }) },
    telegram: { send: vi.fn().mockResolvedValue({ channel: "telegram", status: "sent", messageId: "telegram-1" }) },
  };
}
async function cleanup(prefix: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.booking.deleteMany({ where: { userId: { startsWith: prefix } } });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}
beforeAll(async () => {
  await prisma.$connect();
  // Recover only this suite's fixtures after an interrupted/killed previous run.
  const leftovers = await prisma.user.findMany({ where: { id: { startsWith: "notify_worker_it_" } }, select: { id: true } });
  const stalePrefixes = leftovers.map(({ id }) => id.replace(/_user$/, ""));
  await cleanupTrackedPrefixes(stalePrefixes, cleanup);
});
afterEach(async () => { await cleanupTrackedPrefixes(prefixes, cleanup); });
afterAll(async () => {
  try { await cleanupTrackedPrefixes(prefixes, cleanup); }
  finally { await prisma.$disconnect(); }
});

async function fixture() {
  const prefix = `notify_worker_it_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  prefixes.push(prefix);
  const user = await prisma.user.create({ data: { id: `${prefix}_user`, name: "Private customer", email: `${prefix}@example.test` } });
  const vehicle = await prisma.vehicle.create({ data: {
    id: `${prefix}_vehicle`, slug: prefix, brand: "Toyota", model: "RAV4", year: 2025,
    category: "SUV", seats: 5, transmission: "AUTOMATIC", fuel: "PETROL", drive: "AWD",
    depositAmount: "100.00", location: "Tbilisi",
    pricingRules: { create: { minDays: 1, maxDays: null, pricePerDay: "50.00" } },
  } });
  const startDate = new Date(Date.now() + 30 * 86_400_000);
  const result = await createBooking({ userId: user.id, expectedSessionVersion: 0, idempotencyKey: prefix, booking: {
    vehicleId: vehicle.id, startDate: startDate.toISOString(), endDate: new Date(startDate.getTime() + 86_400_000).toISOString(), pickupLocation: "Tbilisi", returnLocation: "Tbilisi",
  } }, { prisma });
  const notification = await prisma.notification.findFirstOrThrow({ where: { bookingId: result.booking.id } });
  await prisma.notification.update({ where: { id: notification.id }, data: { createdAt: now, nextAttemptAt: now } });
  return { user, booking: result.booking, notification };
}

describe("notification worker database integration", () => {
  it("booking outbox fans out once to email and Telegram; repeated workers do not resend", async () => {
    const { user, booking } = await fixture();
    const worker = config();
    await processNextNotification(prisma, worker, () => now);
    await processNextNotification(prisma, worker, () => now);
    expect(await processNextNotification(prisma, worker, () => now)).toBe(false);
    expect(worker.email.send).toHaveBeenCalledOnce();
    expect(worker.telegram.send).toHaveBeenCalledOnce();
    expect(worker.telegram.send).toHaveBeenCalledWith(expect.objectContaining({ message: `Бронь ${booking.id}\nhttps://booking.example/admin/bookings/${booking.id}` }));
    expect(await prisma.notification.count({ where: { userId: user.id, status: NotificationStatus.SENT } })).toBe(2);
  });

  it("parallel claims cannot claim the same row and expired Telegram leases never auto-replay", async () => {
    const { notification, user } = await fixture();
    const worker = config();
    const claims = await Promise.all([claimNotification(prisma, worker, now), claimNotification(prisma, worker, now)]);
    expect(claims.filter((claim) => claim?.id === notification.id)).toHaveLength(1);
    // One concurrent claimant can see the Telegram row after the email commit.
    await prisma.notification.updateMany({ where: { userId: user.id, channel: NotificationChannel.EMAIL }, data: { status: NotificationStatus.SENT } });
    const telegram = await prisma.notification.findFirstOrThrow({ where: { userId: user.id, channel: NotificationChannel.TELEGRAM } });
    await prisma.notification.update({ where: { id: telegram.id }, data: { attempts: 1, lockedUntil: new Date(now.getTime() - 1) } });
    await processNextNotification(prisma, worker, () => now);
    expect(worker.telegram.send).not.toHaveBeenCalled();
    expect(await prisma.notification.findUniqueOrThrow({ where: { id: telegram.id } })).toMatchObject({ status: "FAILED", errorMessage: "TELEGRAM_LEASE_EXPIRED_REVIEW_REQUIRED" });
  });

  it("never replays an ambiguous Telegram request", async () => {
    const { user } = await fixture();
    const worker = config();
    await processNextNotification(prisma, worker, () => now);
    worker.telegram.send = vi.fn().mockRejectedValue(new NotificationDeliveryError("TELEGRAM_TRANSPORT_UNCERTAIN", false, true));
    await processNextNotification(prisma, worker, () => now);
    await processNextNotification(prisma, worker, () => new Date(now.getTime() + 120_000));
    expect(worker.telegram.send).toHaveBeenCalledOnce();
    expect(await prisma.notification.findFirstOrThrow({ where: { userId: user.id, channel: NotificationChannel.TELEGRAM } })).toMatchObject({ status: "FAILED" });
  });

  it("an email worker cannot overwrite a newer claim's result", async () => {
    const { notification } = await fixture();
    const worker = config();
    worker.email.send = vi.fn(async () => {
      await prisma.notification.update({ where: { id: notification.id }, data: { attempts: { increment: 1 }, status: NotificationStatus.FAILED, lockedUntil: null, errorMessage: "NEWER_CLAIM" } });
      return { channel: "email" as const, status: "sent" as const, messageId: "email-1" };
    });
    await processNextNotification(prisma, worker, () => now);
    expect(await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } })).toMatchObject({ status: "FAILED", errorMessage: "NEWER_CLAIM" });
  });

  it("uses identical delivery data on retry and stops outside provider deduplication window", async () => {
    const { notification } = await fixture();
    const worker = config();
    worker.email.send = vi.fn().mockRejectedValue(new NotificationDeliveryError("EMAIL_TRANSPORT_UNCERTAIN", true, true));
    await processNextNotification(prisma, worker, () => now);
    await processNextNotification(prisma, worker, () => new Date(now.getTime() + 60_000)); // Telegram
    await processNextNotification(prisma, worker, () => new Date(now.getTime() + 60_000)); // email retry
    expect(worker.email.send).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(worker.email.send).mock.calls;
    expect(calls[0]).toEqual(calls[1]);
    await processNextNotification(prisma, worker, () => new Date(now.getTime() + 24 * 3_600_000));
    expect(worker.email.send).toHaveBeenCalledTimes(2);
    expect(await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } })).toMatchObject({ status: "FAILED" });
  });

  it("starts the email deduplication window at first attempt even for an old backlog event", async () => {
    const { notification } = await fixture();
    await prisma.notification.update({ where: { id: notification.id }, data: { createdAt: new Date("1999-01-01T00:00:00Z") } });
    const worker = config();
    worker.email.send = vi.fn().mockRejectedValue(new NotificationDeliveryError("EMAIL_TRANSPORT_UNCERTAIN", true, true));
    await processNextNotification(prisma, worker, () => now);
    await processNextNotification(prisma, worker, () => new Date(now.getTime() + 60_000));
    await processNextNotification(prisma, worker, () => new Date(now.getTime() + 60_000));
    expect(worker.email.send).toHaveBeenCalledTimes(2);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(stored.status).toBe("PENDING");
    expect(stored.payload).toMatchObject({ firstAttemptAt: now.toISOString() });
  });
});
