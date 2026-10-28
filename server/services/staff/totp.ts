import { randomBytes } from "node:crypto";
import { UserRole, UserStatus, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import type { CredentialsUser } from "@/server/repositories/users";
import { backupCodeHash, decryptTotpSecret, encryptTotpSecret, matchTotp } from "@/server/security/totp";

const staffRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];
export async function verifyStaffSecondFactor(user: CredentialsUser, rawCode: unknown, prisma?: PrismaClient, now = new Date()): Promise<boolean> {
  if (typeof rawCode !== "string" || !/^(\d{6}|[a-fA-F0-9]{32})$/.test(rawCode)) return false;
  const client = prisma ?? getPrismaClient();
  const stored = await client.user.findUnique({ where: { id: user.id } });
  if (!stored?.totpEnabledAt || !stored.totpSecretEncrypted) return false;
  const where = {
    id: user.id, status: UserStatus.ACTIVE, role: { in: staffRoles }, sessionVersion: user.sessionVersion,
    passwordHash: user.passwordHash, totpSecretEncrypted: stored.totpSecretEncrypted, totpEnabledAt: { not: null },
  };
  if (/^[a-fA-F0-9]{32}$/.test(rawCode)) {
    const hash = backupCodeHash(user.id, rawCode);
    if (!stored.backupCodeHashes.includes(hash)) return false;
    const result = await client.user.updateMany({ where: { ...where, backupCodeHashes: { equals: stored.backupCodeHashes } }, data: {
      backupCodeHashes: { set: stored.backupCodeHashes.filter((value) => value !== hash) },
    } });
    return result.count === 1;
  }
  const counter = matchTotp(decryptTotpSecret(stored.totpSecretEncrypted, user.id), rawCode, now);
  if (counter === null) return false;
  const result = await client.user.updateMany({ where: { ...where, totpLastCounter: { lt: counter } }, data: { totpLastCounter: counter } });
  return result.count === 1;
}

/** Trusted operator operation, never a public/password-only enrollment endpoint. */
export async function enrollStaffTotp(email: string, secret: string, code: string, prisma: PrismaClient = getPrismaClient(), now = new Date()): Promise<string[]> {
  const counter = matchTotp(secret, code, now);
  if (counter === null) throw new Error("Invalid authenticator code.");
  const codes = Array.from({ length: 10 }, () => randomBytes(16).toString("hex"));
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; role: UserRole; status: UserStatus; totpEnabledAt: Date | null }>>`
      SELECT "id", "role", "status", "totpEnabledAt" FROM "User" WHERE "email" = ${email.trim().toLowerCase()} FOR UPDATE
    `;
    const user = rows[0];
    if (!user || !staffRoles.includes(user.role) || user.status !== UserStatus.ACTIVE || user.totpEnabledAt) {
      throw new Error("Enrollment requires an active staff account without existing 2FA.");
    }
    await tx.user.update({ where: { id: user.id }, data: {
      totpSecretEncrypted: encryptTotpSecret(secret, user.id), totpEnabledAt: now, totpLastCounter: counter,
      backupCodeHashes: codes.map((value) => backupCodeHash(user.id, value)), sessionVersion: { increment: 1 },
    } });
    await tx.auditLog.create({ data: { userId: user.id, action: "STAFF_2FA_ENABLED", entity: "User", entityId: user.id } });
    return codes;
  });
}
