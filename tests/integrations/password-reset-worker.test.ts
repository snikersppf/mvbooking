import { createHash } from "node:crypto";
import { NotificationChannel, NotificationStatus, NotificationType, UserStatus, type Notification, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { NotificationDeliveryError } from "@/server/integrations/notification-production";
import { processNextNotification, type NotificationWorkerConfig } from "@/server/services/notifications/worker";

function harness(status: UserStatus | null = UserStatus.ACTIVE) {
  let now = new Date("2026-10-27T12:00:00Z");
  const row: Notification = {
    id: "reset-notification-1", leadId: null, userId: null, bookingId: null,
    type: NotificationType.PASSWORD_RESET, channel: NotificationChannel.EMAIL,
    status: NotificationStatus.PENDING, payload: { resetEmail: "customer@example.test" },
    eventKey: null, attempts: 0, nextAttemptAt: now, lockedUntil: null,
    sentAt: null, errorMessage: null, createdAt: new Date("2026-10-20"), updatedAt: now,
  };
  let stored: { userId: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null } | null = null;
  const notification = {
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const { attempts, ...rest } = data;
      Object.assign(row, rest);
      if (attempts) row.attempts += 1;
      return { ...row };
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { id?: string }; data: Record<string, unknown> }) => {
      if (!where.id) return { count: 0 }; // Telegram lease recovery.
      Object.assign(row, data);
      return { count: 1 };
    }),
    upsert: vi.fn(),
  };
  const transaction = {
    $queryRaw: vi.fn(async () => row.status === NotificationStatus.PENDING && row.nextAttemptAt <= now ? [{ ...row }] : []),
    notification,
    user: { findUnique: vi.fn(async () => status ? { id: "user-1", status } : null) },
    passwordResetToken: {
      deleteMany: vi.fn(async () => { stored = null; }),
      create: vi.fn(async ({ data }: { data: NonNullable<typeof stored> }) => { stored = { ...data, consumedAt: null }; }),
      findUnique: vi.fn(async () => stored),
    },
  };
  const prisma = {
    notification,
    $transaction: async (operation: (tx: typeof transaction) => Promise<unknown>) => operation(transaction),
  } as unknown as PrismaClient;
  const config: NotificationWorkerConfig = {
    appOrigin: "https://booking.example", managerChatId: "unused",
    authSecret: "test-only-reset-worker-secret-at-least-32-bytes",
    email: { send: vi.fn().mockResolvedValue({ channel: "email", status: "sent", messageId: "mail-1" }) },
    telegram: { send: vi.fn() },
  };
  return {
    row, transaction, prisma, config, token: () => stored,
    advance: (ms: number) => { now = new Date(now.getTime() + ms); },
    run: () => processNextNotification(prisma, config, () => now),
  };
}

describe("password reset notification worker", () => {
  it("creates a hashed token and delivers email once without persisting the raw token", async () => {
    const h = harness();
    await expect(h.run()).resolves.toBe(true);
    const delivery = vi.mocked(h.config.email.send).mock.calls[0]![0];
    const link = delivery.message.split("\n").find((line) => line.startsWith("https://"))!;
    const token = new URL(link).searchParams.get("token")!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(h.token()).toMatchObject({ userId: "user-1", tokenHash: createHash("sha256").update(token).digest("hex") });
    expect(h.token()!.expiresAt.toISOString()).toBe("2026-10-27T13:00:00.000Z");
    expect(JSON.stringify(h.transaction.notification.update.mock.calls)).not.toContain(token);
    expect(h.transaction.notification.upsert).not.toHaveBeenCalled();
    expect(h.config.telegram.send).not.toHaveBeenCalled();
    expect(h.row.status).toBe(NotificationStatus.SENT);
    await expect(h.run()).resolves.toBe(false);
    expect(h.config.email.send).toHaveBeenCalledOnce();
  });

  it.each([null, UserStatus.INACTIVE])("discards an unknown/inactive account (%s) without email or token", async (status) => {
    const h = harness(status);
    await h.run();
    expect(h.config.email.send).not.toHaveBeenCalled();
    expect(h.transaction.passwordResetToken.create).not.toHaveBeenCalled();
    expect(h.row.status).toBe(NotificationStatus.SENT);
  });

  it("retries transient failures with the same delivery and token, even for a backlog request", async () => {
    const h = harness();
    vi.mocked(h.config.email.send).mockRejectedValueOnce(new NotificationDeliveryError("EMAIL_HTTP_503", true));
    await h.run();
    expect(h.row.status).toBe(NotificationStatus.PENDING);
    const token = h.token();
    h.advance(60_000);
    await h.run();
    expect(vi.mocked(h.config.email.send).mock.calls[0]).toEqual(vi.mocked(h.config.email.send).mock.calls[1]);
    expect(h.token()).toEqual(token);
    expect(h.transaction.passwordResetToken.create).toHaveBeenCalledOnce();
    expect(h.row.status).toBe(NotificationStatus.SENT);
  });

  it.each(["expired", "consumed", "superseded"])("never regenerates a %s token during retries", async (state) => {
    const h = harness();
    vi.mocked(h.config.email.send).mockRejectedValue(new NotificationDeliveryError("EMAIL_HTTP_503", true));
    await h.run();
    if (state === "expired") h.advance(3_600_000);
    else {
      h.advance(60_000);
      if (state === "consumed") h.token()!.consumedAt = new Date();
      else h.transaction.passwordResetToken.findUnique.mockResolvedValueOnce(null);
    }
    await h.run();
    expect(h.row).toMatchObject({ status: NotificationStatus.FAILED, errorMessage: "RESET_TOKEN_UNAVAILABLE" });
    expect(h.config.email.send).toHaveBeenCalledOnce();
    expect(h.transaction.passwordResetToken.create).toHaveBeenCalledOnce();
  });

  it("reconstructs the same delivery after an expired worker lease", async () => {
    const h = harness();
    vi.mocked(h.config.email.send).mockRejectedValueOnce(new NotificationDeliveryError("EMAIL_TRANSPORT_UNCERTAIN", true, true));
    await h.run();
    // Simulate a crash after sending and before recording success.
    h.row.lockedUntil = new Date("2026-10-27T12:01:00Z");
    h.advance(120_000);
    await h.run();
    expect(vi.mocked(h.config.email.send).mock.calls[0]).toEqual(vi.mocked(h.config.email.send).mock.calls[1]);
  });
});
