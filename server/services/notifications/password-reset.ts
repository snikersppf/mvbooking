import { createHash, createHmac } from "node:crypto";
import { NotificationChannel, NotificationStatus, Prisma, UserStatus, type Notification } from "@prisma/client";
import { z } from "zod";
import { requireAuthSecret } from "@/server/config/auth";
import { NotificationDeliveryError } from "@/server/integrations/notification-production";
import type { NotificationWorkerConfig } from "./worker";

const LIFETIME_MS = 60 * 60 * 1_000;
const resetPayload = z.object({ resetEmail: z.email(), firstAttemptAt: z.iso.datetime().optional() });

function resetToken(row: Notification, config: NotificationWorkerConfig): string {
  // Reconstruct the same token after a crash without persisting a bearer credential.
  const secret = requireAuthSecret({ AUTH_SECRET: config.authSecret ?? process.env.AUTH_SECRET });
  return createHmac("sha256", secret).update(`password-reset/notification/${row.id}`).digest("base64url");
}

export function passwordResetDelivery(row: Notification, config: NotificationWorkerConfig) {
  const payload = resetPayload.parse(row.payload);
  const link = `${config.appOrigin}/reset-password?token=${resetToken(row, config)}`;
  return {
    recipient: payload.resetEmail,
    subject: "Сброс пароля MVBooking",
    message: `Откройте ссылку для смены пароля:\n${link}\nСсылка действует один час. Если вы не запрашивали сброс, проигнорируйте это письмо.`,
    idempotencyKey: `notification/${row.id}`,
  };
}

export async function claimPasswordReset(
  transaction: Prisma.TransactionClient,
  row: Notification,
  config: NotificationWorkerConfig,
  now: Date,
  leaseMs: number,
): Promise<Notification> {
  const parsed = resetPayload.safeParse(row.payload);
  if (!parsed.success || row.channel !== NotificationChannel.EMAIL) {
    return transaction.notification.update({ where: { id: row.id }, data: {
      status: NotificationStatus.FAILED, lockedUntil: null, errorMessage: "RESET_PAYLOAD_INVALID",
    } });
  }
  if (!config.appOrigin.startsWith("https://")) throw new NotificationDeliveryError("RESET_ORIGIN_INVALID", false);
  const payload = parsed.data;
  const user = await transaction.user.findUnique({ where: { email: payload.resetEmail }, select: { id: true, status: true } });
  if (!user || user.status !== UserStatus.ACTIVE) {
    return transaction.notification.update({ where: { id: row.id }, data: {
      status: NotificationStatus.SENT, lockedUntil: null, sentAt: now, payload: Prisma.DbNull,
    } });
  }
  const tokenHash = createHash("sha256").update(resetToken(row, config)).digest("hex");
  const firstAttemptAt = payload.firstAttemptAt ?? now.toISOString();
  if (payload.firstAttemptAt) {
    // Never resurrect an expired, consumed or superseded token on a delivery retry.
    const token = await transaction.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token || token.userId !== user.id || token.consumedAt || token.expiresAt <= now) {
      return transaction.notification.update({ where: { id: row.id }, data: {
        status: NotificationStatus.FAILED, lockedUntil: null, errorMessage: "RESET_TOKEN_UNAVAILABLE", payload: Prisma.DbNull,
      } });
    }
  } else {
    await transaction.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await transaction.passwordResetToken.create({ data: {
      userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + LIFETIME_MS),
    } });
  }
  return transaction.notification.update({ where: { id: row.id }, data: {
    userId: user.id, attempts: { increment: 1 }, lockedUntil: new Date(now.getTime() + leaseMs),
    payload: { resetEmail: payload.resetEmail, firstAttemptAt }, errorMessage: null,
  } });
}
