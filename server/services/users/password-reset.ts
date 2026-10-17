import { createHash, randomBytes } from "node:crypto";
import { Prisma, UserStatus, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import { requireAppOrigin } from "@/server/config/http";
import { ApiRequestError } from "@/server/http/api-response";
import { hashPassword } from "@/server/security/password";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/server/validators/auth";

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1_000;

export type PasswordResetDependencies = Readonly<{
  prisma?: PrismaClient;
  now?: () => Date;
  createToken?: () => string;
  logResetLink?: (link: string) => void;
  appOrigin?: string;
  production?: boolean;
}>;

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function requestPasswordReset(
  rawInput: unknown,
  dependencies: PasswordResetDependencies = {},
): Promise<void> {
  const { email } = passwordResetRequestSchema.parse(rawInput);
  const production = dependencies.production ?? process.env.NODE_ENV === "production";
  if (production) {
    throw new ApiRequestError(
      503,
      "PASSWORD_RESET_DELIVERY_UNAVAILABLE",
      "errors.serviceUnavailable",
    );
  }

  const prisma = dependencies.prisma ?? getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  // The HTTP response is identical for unknown and inactive accounts.
  if (!user || user.status !== UserStatus.ACTIVE) return;

  const token = dependencies.createToken?.() ?? randomBytes(32).toString("base64url");
  const origin = dependencies.appOrigin ?? requireAppOrigin();
  const expiresAt = new Date((dependencies.now?.() ?? new Date()).getTime() + RESET_TOKEN_LIFETIME_MS);
  await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await transaction.passwordResetToken.create({
      data: { userId: user.id, tokenHash: tokenHash(token), expiresAt },
    });
  });

  const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  (dependencies.logResetLink ?? ((value) => console.log("Development password reset link:", value)))(link);
}

export async function confirmPasswordReset(
  rawInput: unknown,
  dependencies: PasswordResetDependencies = {},
): Promise<void> {
  const { token, password } = passwordResetConfirmSchema.parse(rawInput);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const now = dependencies.now?.() ?? new Date();
  const passwordHash = await hashPassword(password);
  const hash = tokenHash(token);

  await prisma.$transaction(async (transaction) => {
    const stored = await transaction.passwordResetToken.findUnique({
      where: { tokenHash: hash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });
    if (!stored || stored.consumedAt || stored.expiresAt <= now) {
      throw new ApiRequestError(400, "RESET_TOKEN_INVALID", "errors.invalidResetToken");
    }

    const claim = await transaction.passwordResetToken.updateMany({
      where: { id: stored.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (claim.count !== 1) {
      throw new ApiRequestError(400, "RESET_TOKEN_INVALID", "errors.invalidResetToken");
    }
    const updated = await transaction.user.updateMany({
      where: { id: stored.userId, status: UserStatus.ACTIVE },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new ApiRequestError(400, "RESET_TOKEN_INVALID", "errors.invalidResetToken");
    }
    await transaction.passwordResetToken.deleteMany({ where: { userId: stored.userId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
