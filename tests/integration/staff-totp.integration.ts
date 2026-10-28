import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { backupCodeHash, encryptTotpSecret, totpAt } from "@/server/security/totp";
import { verifyStaffSecondFactor } from "@/server/services/staff/totp";

const prisma = createPrismaClient(requireTestDatabaseUrl()), prefixes: string[] = [];
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
async function cleanup(prefix: string) { await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } }); }
afterEach(async () => { try { await cleanupTrackedPrefixes(prefixes, cleanup); } finally { vi.unstubAllEnvs(); } });
afterAll(async () => { try { await cleanupTrackedPrefixes(prefixes, cleanup); } finally { await prisma.$disconnect(); } });
async function fixture() {
  vi.stubEnv("MFA_ENCRYPTION_KEY", Buffer.alloc(32, 6).toString("base64"));
  const id = `totp_it_${randomUUID()}`; prefixes.push(id);
  const code = "a".repeat(32);
  const user = await prisma.user.create({ data: {
    id, name: "Staff test", email: `${id}@example.test`, role: "MANAGER", passwordHash: "test-hash",
    totpSecretEncrypted: encryptTotpSecret(secret, id), totpEnabledAt: new Date(), backupCodeHashes: [backupCodeHash(id, code)],
  } });
  return { user, code };
}
describe("staff second-factor PostgreSQL races", () => {
  it("accepts one authenticator step exactly once under parallel requests", async () => {
    const { user } = await fixture(), now = new Date();
    const code = totpAt(secret, Math.floor(now.getTime() / 30_000));
    const results = await Promise.all([1, 2].map(() => verifyStaffSecondFactor(user, code, prisma, now)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("consumes one backup code once under parallel requests", async () => {
    const { user, code } = await fixture();
    const results = await Promise.all([1, 2].map(() => verifyStaffSecondFactor(user, code, prisma)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).backupCodeHashes).toEqual([]);
  });
});
