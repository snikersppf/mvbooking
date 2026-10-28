import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeCredentials } from "@/server/auth/credentials";
import { requireRole } from "@/server/auth/guards";
import type { UserRepository } from "@/server/repositories/users";
import { verifyPassword } from "@/server/security/password";
import { enrollStaffTotp, verifyStaffSecondFactor } from "@/server/services/staff/totp";
import { totpAt } from "@/server/security/totp";
import { createFirstAdmin } from "@/server/services/admin/create-first-admin";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const databaseUrl = requireTestDatabaseUrl();
if (new URL(databaseUrl).pathname !== "/mvbooking_test") {
  throw new Error("First-admin integration requires mvbooking_test.");
}
const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }, { schema: "public" }) });
const prefixes: string[] = [];

function newPrefix(): string {
  const prefix = `bootstrap_it_${randomUUID().replaceAll("-", "")}`;
  prefixes.push(prefix);
  return prefix;
}

async function cleanup(prefix: string): Promise<void> {
  const users = { email: { startsWith: prefix } };
  await client.auditLog.deleteMany({ where: { user: users } });
  await client.user.deleteMany({ where: users });
}

beforeAll(async () => {
  // Recover only this suite's fixtures after an interrupted run.
  await cleanupTrackedPrefixes(["bootstrap_it_"], cleanup);
});
beforeEach(async () => {
  vi.stubEnv("MFA_ENCRYPTION_KEY", Buffer.alloc(32, 5).toString("base64"));
  // Bootstrap requires no existing ADMIN. Never remove unrelated test data.
  if (await client.user.count({ where: { role: UserRole.ADMIN } })) {
    throw new Error("First-admin integration requires mvbooking_test.public without existing administrators.");
  }
});
afterEach(async () => { try { await cleanupTrackedPrefixes(prefixes, cleanup); } finally { vi.unstubAllEnvs(); } });
afterAll(async () => {
  try { await cleanupTrackedPrefixes(prefixes, cleanup); }
  finally { await client.$disconnect(); }
});

describe("first-admin production bootstrap on mvbooking_test.public", () => {
  const password = "integration bootstrap password only";

  it("creates an admin who passes credentials and the DB role guard; repeat preserves password", async () => {
    const prefix = newPrefix();
    const input = { email: `${prefix}@example.test`, name: "Bootstrap test", password };
    const created = await createFirstAdmin(input, client);
    expect(created.created).toBe(true);
    const original = await client.user.findUniqueOrThrow({ where: { id: created.id } });
    const repository: UserRepository = {
      findCredentialsUserByEmail: (email) => client.user.findUnique({ where: { email } }),
      findAuthorizationUserById: (id) => client.user.findUnique({ where: { id } }),
      createCustomer: async () => { throw new Error("Registration is outside this bootstrap test."); },
    };
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    const backups = await enrollStaffTotp(input.email, secret, totpAt(secret, Math.floor(Date.now() / 30_000)), client);
    const authorized = await authorizeCredentials({ ...input, otp: backups[0] }, new Request("https://booking.example.test/api/auth/callback/credentials"), {
      repository, passwordVerifier: verifyPassword,
      secondFactorVerifier: (user, code) => verifyStaffSecondFactor(user, code, client),
      rateLimiter: { check: async () => undefined },
      authSecret: "bootstrap-integration-auth-secret-only",
      trustProxy: false, connectionAddress: "127.0.0.1",
    });
    expect(authorized?.id).toBe(created.id);
    const admin = await requireRole([UserRole.ADMIN], repository, async () => ({
      user: { id: created.id, role: UserRole.ADMIN, sessionVersion: authorized!.sessionVersion, mfaVerified: true },
      expires: new Date(Date.now() + 60_000).toISOString(),
    }));
    expect(admin.id).toBe(created.id);
    expect(await createFirstAdmin({ ...input, password: "different valid password" }, client)).toEqual({ id: created.id, created: false });
    expect((await client.user.findUniqueOrThrow({ where: { id: created.id } })).passwordHash).toBe(original.passwordHash);
    expect(await client.auditLog.count({ where: { userId: created.id, action: "ADMIN_BOOTSTRAPPED" } })).toBe(1);
  });

  it("serializes concurrent attempts and never creates two first administrators", async () => {
    const prefix = newPrefix();
    const attempts = await Promise.allSettled(["one", "two"].map((name) =>
      createFirstAdmin({ name: `Bootstrap ${name}`, email: `${prefix}_${name}@example.test`, password }, client),
    ));
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(await client.user.count({ where: { role: UserRole.ADMIN } })).toBe(1);
    expect(await client.auditLog.count({ where: { user: { email: { startsWith: prefix } } } })).toBe(1);
  });
});
