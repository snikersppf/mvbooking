import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createFirstAdmin } from "@/server/services/admin/create-first-admin";
import { ADMINISTRATION_LOCK_KEY } from "@/server/repositories/admin-users";
import { verifyPassword } from "@/server/security/password";
import { authorizeCredentials } from "@/server/auth/credentials";

function harness(existing: { id: string; role: UserRole; status: UserStatus; passwordHash: string | null } | null = null, administrators = 0) {
  const transaction = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    user: {
      findUnique: vi.fn().mockResolvedValue(existing),
      count: vi.fn().mockResolvedValue(administrators),
      create: vi.fn().mockResolvedValue({ id: "first-admin" }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const client = {
    $transaction: vi.fn(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn(transaction as unknown as Prisma.TransactionClient)),
  };
  return { transaction, client: client as unknown as Parameters<typeof createFirstAdmin>[1] };
}

describe("first administrator bootstrap", () => {
  const input = { name: "Bootstrap Admin", email: " Bootstrap@Example.org ", password: "bootstrap test password only" };

  it("uses the existing admin lock and creates a login-compatible hash with an audit record", async () => {
    const { transaction, client } = harness();
    expect(await createFirstAdmin(input, client)).toEqual({ id: "first-admin", created: true });
    expect(transaction.$executeRaw.mock.calls[0][1]).toBe(ADMINISTRATION_LOCK_KEY);
    const { data } = transaction.user.create.mock.calls[0][0];
    expect(data.email).toBe("bootstrap@example.org");
    expect(data.role).toBe(UserRole.ADMIN);
    expect(data.passwordHash).not.toBe(input.password);
    expect(await verifyPassword(input.password, data.passwordHash)).toBe(true);
    expect(JSON.stringify(transaction.auditLog.create.mock.calls)).not.toContain(input.password);
    expect(JSON.stringify(transaction.auditLog.create.mock.calls)).not.toContain(data.passwordHash);
    const authenticated = await authorizeCredentials({ email: input.email, password: input.password }, new Request("https://booking.example.org/api/auth/callback/credentials"), {
      repository: {
        findCredentialsUserByEmail: vi.fn().mockResolvedValue({ ...data, id: "first-admin", sessionVersion: 0 }),
        findAuthorizationUserById: vi.fn(),
        createCustomer: vi.fn(),
      },
      passwordVerifier: verifyPassword,
      rateLimiter: { check: vi.fn().mockResolvedValue(undefined) },
      authSecret: "unit-test-secret-long-enough-for-hashing",
      trustProxy: false,
      connectionAddress: "127.0.0.1",
    });
    expect(authenticated).toBeNull(); // Bootstrap hash is valid, but staff must enroll/verify 2FA before sign-in.
  });

  it("repeated bootstrap leaves the administrator and their password untouched", async () => {
    const { transaction, client } = harness({ id: "existing", role: UserRole.ADMIN, status: UserStatus.ACTIVE, passwordHash: "existing-hash" }, 1);
    expect(await createFirstAdmin(input, client)).toEqual({ id: "existing", created: false });
    expect(transaction.user.create).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([UserRole.CUSTOMER, UserRole.MANAGER])("never promotes an existing %s", async (role) => {
    const { transaction, client } = harness({ id: "existing", role, status: UserStatus.ACTIVE, passwordHash: "hash" });
    await expect(createFirstAdmin(input, client)).rejects.toThrow("existing account");
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it("refuses another bootstrap when an administrator already exists", async () => {
    const { transaction, client } = harness(null, 1);
    await expect(createFirstAdmin(input, client)).rejects.toThrow("administrator already exists");
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it("validates input before a database transaction", async () => {
    const { client } = harness();
    await expect(createFirstAdmin({ ...input, password: "short" }, client)).rejects.toThrow();
    expect(client?.$transaction).not.toHaveBeenCalled();
  });
});
