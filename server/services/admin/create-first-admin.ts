import { Prisma, UserRole, UserStatus, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import { ADMINISTRATION_LOCK_KEY } from "@/server/repositories/admin-users";
import { hashPassword } from "@/server/security/password";
import { registrationSchema } from "@/server/validators/auth";

export type FirstAdminResult = Readonly<{ id: string; created: boolean }>;

/** Operator-only bootstrap. Never promotes an existing account or resets a password. */
export async function createFirstAdmin(
  input: unknown,
  client: Pick<PrismaClient, "$transaction"> = getPrismaClient(),
): Promise<FirstAdminResult> {
  const data = registrationSchema.omit({ phone: true }).parse(input);
  const passwordHash = await hashPassword(data.password);

  return client.$transaction(async (transaction) => {
    // Serialize bootstrap with every role/status mutation, including concurrent bootstraps.
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${ADMINISTRATION_LOCK_KEY}))
    `;
    const existing = await transaction.user.findUnique({
      where: { email: data.email },
      select: { id: true, role: true, status: true, passwordHash: true },
    });
    if (existing) {
      if (existing.role === UserRole.ADMIN && existing.status === UserStatus.ACTIVE && existing.passwordHash) {
        return { id: existing.id, created: false };
      }
      throw new Error("The email belongs to an existing account. Bootstrap cannot change it.");
    }
    // Even an inactive administrator prevents bootstrap: recovery is a separate operator action.
    if (await transaction.user.count({ where: { role: UserRole.ADMIN } })) {
      throw new Error("An administrator already exists. Use the authenticated admin interface.");
    }
    const user = await transaction.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: { userId: user.id, action: "ADMIN_BOOTSTRAPPED", entity: "User", entityId: user.id, metadata: { source: "create-admin" } },
    });
    return { id: user.id, created: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 5_000 });
}
