import { NotificationChannel, NotificationStatus, NotificationType, Prisma, type Notification, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAppOrigin } from "@/server/config/http";
import type { NotificationInput, NotificationProvider } from "@/server/integrations/notification";
import { NotificationDeliveryError } from "@/server/integrations/notification-production";
import { claimPasswordReset, passwordResetDelivery } from "./password-reset";

const LEASE_MS = 60_000;
const MAX_ATTEMPTS = 8;
// Resend keys expire after 24h. Stop before this boundary, including clock skew.
const EMAIL_RETRY_WINDOW_MS = 23 * 60 * 60 * 1_000;
const deliverySchema = z.object({
  recipient: z.string(), message: z.string(), subject: z.string(), idempotencyKey: z.string(),
});
const payloadSchema = z.object({ delivery: deliverySchema, firstAttemptAt: z.iso.datetime().optional() });

export type NotificationWorkerConfig = Readonly<{
  appOrigin: string;
  managerChatId: string;
  email: NotificationProvider;
  telegram: NotificationProvider;
  authSecret?: string;
}>;

const subjects: Record<Exclude<NotificationType, "PASSWORD_RESET" | "LEAD_CREATED">, string> = {
  BOOKING_CREATED: "Заявка на бронирование получена",
  BOOKING_UPDATED: "Бронирование обновлено",
  BOOKING_CANCELLED: "Бронирование отменено",
  BOOKING_CONFIRMED: "Бронирование подтверждено",
  BOOKING_REJECTED: "Заявка на бронирование отклонена",
};

export function bookingNotificationInput(
  notification: Pick<Notification, "id" | "bookingId" | "channel" | "type">,
  recipient: string,
  appOrigin: string,
): Required<NotificationInput> {
  if (!notification.bookingId) throw new NotificationDeliveryError("BOOKING_MISSING", false);
  if (notification.type === NotificationType.PASSWORD_RESET || notification.type === NotificationType.LEAD_CREATED) throw new NotificationDeliveryError("BOOKING_TYPE_INVALID", false);
  const subject = subjects[notification.type];
  // Customer cards live on the list page; there is no /account/bookings/[id] route.
  const path = notification.channel === NotificationChannel.TELEGRAM
    ? `/admin/bookings/${encodeURIComponent(notification.bookingId)}`
    : "/account/bookings";
  const link = `${appOrigin}${path}`;
  return {
    recipient, subject,
    // Manager messages intentionally contain no customer, vehicle, money or dates.
    message: notification.channel === NotificationChannel.TELEGRAM
      ? `Бронь ${notification.bookingId}\n${link}`
      : `${subject}.\nБронь ${notification.bookingId}\n${link}`,
    idempotencyKey: `notification/${notification.id}`,
  };
}

export async function claimNotification(
  prisma: PrismaClient,
  config: NotificationWorkerConfig,
  now = new Date(),
): Promise<Notification | null> {
  return prisma.$transaction(async (transaction) => {
    // A crashed Telegram worker may already have sent the message. Never replay blindly.
    await transaction.notification.updateMany({
      where: { status: NotificationStatus.PENDING, channel: NotificationChannel.TELEGRAM, lockedUntil: { lte: now } },
      data: { status: NotificationStatus.FAILED, lockedUntil: null, errorMessage: "TELEGRAM_LEASE_EXPIRED_REVIEW_REQUIRED" },
    });
    const rows = await transaction.$queryRaw<Notification[]>`
      SELECT * FROM "Notification"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= ${now}
        AND ("lockedUntil" IS NULL OR "lockedUntil" <= ${now})
      ORDER BY "nextAttemptAt", "createdAt", "id"
      FOR UPDATE SKIP LOCKED LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;

    if (row.type === NotificationType.LEAD_CREATED) {
      // Deliberate stub: acknowledgement is durable, no external delivery or PII logging.
      return transaction.notification.update({ where: { id: row.id }, data: {
        status: NotificationStatus.SENT, sentAt: now, lockedUntil: null,
        attempts: { increment: 1 }, payload: { provider: "stub", delivery: "mock-sent" },
      } });
    }

    if (row.type === NotificationType.PASSWORD_RESET) {
      if (row.attempts >= MAX_ATTEMPTS) {
        return transaction.notification.update({ where: { id: row.id }, data: {
          status: NotificationStatus.FAILED, lockedUntil: null, errorMessage: "DELIVERY_RETRY_LIMIT_REVIEW_REQUIRED",
        } });
      }
      return claimPasswordReset(transaction, row, config, now, LEASE_MS);
    }

    // Fan-out is durable and atomic with the claim, using the existing outbox model.
    if (row.channel === NotificationChannel.EMAIL && row.bookingId) {
      await transaction.notification.upsert({
        where: { eventKey: `telegram:${row.id}` }, update: {},
        create: { userId: row.userId, bookingId: row.bookingId, type: row.type, channel: NotificationChannel.TELEGRAM, eventKey: `telegram:${row.id}`, createdAt: now, nextAttemptAt: now },
      });
    }
    const existing = payloadSchema.safeParse(row.payload);
    // Freeze the start of the provider deduplication window, not the event creation time.
    // Rows from an earlier worker without this timestamp retain a conservative boundary.
    const firstAttemptAt = existing.success
      ? existing.data.firstAttemptAt ?? row.createdAt.toISOString() : now.toISOString();
    if (row.attempts >= MAX_ATTEMPTS || (row.channel === NotificationChannel.EMAIL && row.attempts > 0 && now.getTime() - new Date(firstAttemptAt).getTime() >= EMAIL_RETRY_WINDOW_MS)) {
      return transaction.notification.update({
        where: { id: row.id },
        data: { status: NotificationStatus.FAILED, lockedUntil: null, errorMessage: "DELIVERY_RETRY_LIMIT_REVIEW_REQUIRED" },
      });
    }
    let delivery: Required<NotificationInput>;
    try {
      if (row.channel !== NotificationChannel.EMAIL && row.channel !== NotificationChannel.TELEGRAM) {
        throw new NotificationDeliveryError("CHANNEL_UNSUPPORTED", false);
      }
      if (!row.userId) throw new NotificationDeliveryError("RECIPIENT_MISSING", false);
      const user = row.channel === NotificationChannel.EMAIL
        ? await transaction.user.findUniqueOrThrow({ where: { id: row.userId }, select: { email: true } }) : null;
      delivery = existing.success ? existing.data.delivery : bookingNotificationInput(row, user?.email ?? config.managerChatId, config.appOrigin);
    } catch (error) {
      if (!(error instanceof NotificationDeliveryError)) throw error;
      return transaction.notification.update({ where: { id: row.id }, data: { status: NotificationStatus.FAILED, lockedUntil: null, errorMessage: error.code } });
    }
    return transaction.notification.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 }, lockedUntil: new Date(now.getTime() + LEASE_MS), payload: { delivery, firstAttemptAt }, errorMessage: null },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5_000, timeout: 5_000 });
}

export async function processNextNotification(
  prisma: PrismaClient,
  config: NotificationWorkerConfig,
  now: () => Date = () => new Date(),
): Promise<boolean> {
  const row = await claimNotification(prisma, config, now());
  if (!row) return false;
  if (row.status !== NotificationStatus.PENDING) return true;
  const tokenEmail = row.type === NotificationType.PASSWORD_RESET;
  const snapshot = tokenEmail ? null : payloadSchema.parse(row.payload);
  const delivery = tokenEmail ? passwordResetDelivery(row, config) : snapshot!.delivery;
  const firstAttemptAt = new Date(tokenEmail
    ? z.object({ firstAttemptAt: z.iso.datetime() }).parse(row.payload).firstAttemptAt
    : snapshot?.firstAttemptAt ?? row.createdAt);
  const provider = row.channel === NotificationChannel.EMAIL ? config.email : config.telegram;
  let failure: NotificationDeliveryError | undefined;
  try {
    const result = await provider.send(delivery);
    if (result.status !== "sent") throw new NotificationDeliveryError("MOCK_DELIVERY_NOT_ALLOWED", false);
  } catch (error) {
    failure = error instanceof NotificationDeliveryError ? error : new NotificationDeliveryError("DELIVERY_UNEXPECTED_ERROR", false, true);
  }
  const completedAt = now();
  const retryDelay = Math.max(30 * 2 ** (row.attempts - 1), failure?.retryAfterSeconds ?? 0);
  const nextAttemptAt = new Date(completedAt.getTime() + retryDelay * 1_000);
  const retry = failure?.retryable && row.attempts < MAX_ATTEMPTS &&
    (row.channel !== NotificationChannel.EMAIL || nextAttemptAt.getTime() - firstAttemptAt.getTime() < EMAIL_RETRY_WINDOW_MS);
  // Compare the claim generation: a stale worker cannot overwrite another worker's result.
  const result = await prisma.notification.updateMany({
    where: { id: row.id, status: NotificationStatus.PENDING, attempts: row.attempts, lockedUntil: row.lockedUntil },
    data: failure
      ? { status: retry ? NotificationStatus.PENDING : NotificationStatus.FAILED, lockedUntil: null, nextAttemptAt, errorMessage: failure.code }
      : { status: NotificationStatus.SENT, lockedUntil: null, sentAt: completedAt, errorMessage: null, ...(tokenEmail ? { payload: Prisma.DbNull } : {}) },
  });
  if (result.count !== 1) console.warn("Notification claim lost; manual delivery review may be required.");
  if (failure && !retry) console.warn("Notification requires manual delivery review.");
  return true;
}

export function requireNotificationOrigin(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const origin = requireAppOrigin(env);
  if (env.NODE_ENV === "production" && !origin.startsWith("https://")) throw new Error("Production notification APP_ORIGIN must use HTTPS.");
  return origin;
}
