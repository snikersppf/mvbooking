import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { CredentialsUser } from "@/server/repositories/users";
import { backupCodeHash, decryptTotpSecret, encryptTotpSecret, generateTotpSecret, matchTotp, totpAt } from "@/server/security/totp";
import { enrollStaffTotp, verifyStaffSecondFactor } from "@/server/services/staff/totp";
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const now = new Date("2026-10-28T12:00:00Z");
beforeEach(() => vi.stubEnv("MFA_ENCRYPTION_KEY", Buffer.alloc(32, 9).toString("base64")));
afterEach(() => vi.unstubAllEnvs());

describe("TOTP cryptography", () => {
  it.each([[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"]])("matches RFC 6238 SHA-1 at %s", (seconds, expected) => {
    expect(totpAt(secret, Math.floor(Number(seconds) / 30), 8)).toBe(expected);
  });
  it("encrypts with unique nonces and binds secrets to the correct account", () => {
    const first = encryptTotpSecret(secret, "user-1"), second = encryptTotpSecret(secret, "user-1");
    expect(first).not.toBe(second);
    expect(first).not.toContain(secret);
    expect(decryptTotpSecret(first, "user-1")).toBe(secret);
    expect(() => decryptTotpSecret(first, "user-2")).toThrow();
    expect(() => decryptTotpSecret(first.slice(0, -4) + "AAAA", "user-1")).toThrow();
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
  it("limits clock drift and rejects invalid codes or encryption configuration", () => {
    const counter = Math.floor(now.getTime() / 30_000);
    expect(matchTotp(secret, totpAt(secret, counter + 1), now)).toBe(counter + 1);
    expect(matchTotp(secret, totpAt(secret, counter + 4), now)).toBeNull();
    expect(matchTotp(secret, "abc", now)).toBeNull();
    vi.stubEnv("MFA_ENCRYPTION_KEY", "invalid");
    expect(() => encryptTotpSecret(secret, "user-1")).toThrow("MFA_ENCRYPTION_KEY");
  });
});
function harness() {
  const codeA = "a".repeat(32), codeB = "b".repeat(32);
  const credentials: CredentialsUser = { id: "user-1", name: "Staff", email: "staff@example.test", phone: null, passwordHash: "hash", role: "ADMIN", status: "ACTIVE", sessionVersion: 1 };
  const stored = { ...credentials, totpEnabledAt: now, totpSecretEncrypted: encryptTotpSecret(secret, "user-1"), totpLastCounter: -1, backupCodeHashes: [backupCodeHash("user-1", codeA), backupCodeHash("user-1", codeB)] };
  const updateMany = vi.fn(async ({ where, data }: { where: { sessionVersion: number; totpLastCounter?: { lt: number }; backupCodeHashes?: { equals: string[] } }; data: { totpLastCounter?: number; backupCodeHashes?: { set: string[] } } }) => {
    if (where.sessionVersion !== stored.sessionVersion) return { count: 0 };
    if (where.totpLastCounter && stored.totpLastCounter >= where.totpLastCounter.lt) return { count: 0 };
    if (where.backupCodeHashes && JSON.stringify(where.backupCodeHashes.equals) !== JSON.stringify(stored.backupCodeHashes)) return { count: 0 };
    if (data.totpLastCounter !== undefined) stored.totpLastCounter = data.totpLastCounter;
    if (data.backupCodeHashes) stored.backupCodeHashes = data.backupCodeHashes.set;
    return { count: 1 };
  });
  const prisma = { user: { findUnique: vi.fn(async () => ({ ...stored, backupCodeHashes: [...stored.backupCodeHashes] })), updateMany } } as unknown as PrismaClient;
  return { prisma, credentials, stored, codeA, codeB, updateMany };
}
it("accepts a TOTP once across parallel sign-ins and rejects a stale session", async () => {
  const h = harness(), code = totpAt(secret, Math.floor(now.getTime() / 30_000));
  const results = await Promise.all([1, 2].map(() => verifyStaffSecondFactor(h.credentials, code, h.prisma, now)));
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(await verifyStaffSecondFactor(h.credentials, code, h.prisma, now)).toBe(false);
  expect(await verifyStaffSecondFactor({ ...h.credentials, sessionVersion: 0 }, h.codeA, h.prisma, now)).toBe(false);
});
it("allows only one parallel use of the same backup code and rejects its replay", async () => {
  const h = harness();
  const results = await Promise.all([1, 2].map(() => verifyStaffSecondFactor(h.credentials, h.codeA, h.prisma, now)));
  expect(results.toSorted()).toEqual([false, true]);
  expect(await verifyStaffSecondFactor(h.credentials, h.codeA, h.prisma, now)).toBe(false);
  expect(h.stored.backupCodeHashes).toEqual([backupCodeHash(h.credentials.id, h.codeB)]);
});
it("atomically consumes backup codes without resurrecting another code during parallel logins", async () => {
  const h = harness();
  const results = await Promise.all([h.codeA, h.codeB].map((code) => verifyStaffSecondFactor(h.credentials, code, h.prisma, now)));
  expect(results.filter(Boolean)).toHaveLength(1);
  const used = results[0] ? h.codeA : h.codeB, unused = results[0] ? h.codeB : h.codeA;
  expect(await verifyStaffSecondFactor(h.credentials, used, h.prisma, now)).toBe(false);
  expect(await verifyStaffSecondFactor(h.credentials, unused, h.prisma, now)).toBe(true);
  expect(await verifyStaffSecondFactor(h.credentials, used, h.prisma, now)).toBe(false);
  expect(h.stored.backupCodeHashes).toEqual([]);
});

it("enrolls staff atomically, hashes backup codes and revokes old sessions", async () => {
  const update = vi.fn(), audit = vi.fn();
  const rows = vi.fn().mockResolvedValue([{ id: "staff-1", role: "ADMIN", status: "ACTIVE", totpEnabledAt: null }]);
  const tx = { $queryRaw: rows, user: { update }, auditLog: { create: audit } };
  const prisma = { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
  const code = totpAt(secret, Math.floor(now.getTime() / 30_000));
  const backups = await enrollStaffTotp("staff@example.test", secret, code, prisma, now);
  expect(backups).toHaveLength(10);
  const data = update.mock.calls[0]![0].data;
  expect(data.sessionVersion).toEqual({ increment: 1 });
  expect(decryptTotpSecret(data.totpSecretEncrypted, "staff-1")).toBe(secret);
  expect(data.backupCodeHashes[0]).toBe(backupCodeHash("staff-1", backups[0]!));
  expect(JSON.stringify(data)).not.toContain(backups[0]);
  expect(JSON.stringify(audit.mock.calls)).not.toContain(secret);
  rows.mockResolvedValueOnce([{ id: "staff-1", role: "ADMIN", status: "ACTIVE", totpEnabledAt: now }]);
  await expect(enrollStaffTotp("staff@example.test", secret, code, prisma, now)).rejects.toThrow("without existing 2FA");
});
