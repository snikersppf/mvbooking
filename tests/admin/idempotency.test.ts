import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  stored: null as null | { requestHash: string; response: unknown },
}));

vi.mock("@/server/db/prisma", () => ({ getPrismaClient: () => ({}) }));
vi.mock("@/server/repositories/users", () => ({
  lockUserById: async () => ({
    id: "admin-1",
    role: "ADMIN",
    status: "ACTIVE",
    sessionVersion: 2,
  }),
}));
vi.mock("@/server/services/booking/transaction", () => ({
  runBookingTransaction: async (
    _client: unknown,
    _requestId: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<unknown>,
  ) => {
    const transaction = {
      $queryRaw: async () => state.stored ? [state.stored] : [],
      $executeRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => {
        if (parts.join("?").includes('INSERT INTO "AdminMutationResult"')) {
          state.stored = {
            requestHash: String(values[3]),
            response: JSON.parse(String(values[4])) as unknown,
          };
        }
        return 1;
      },
    } as unknown as Prisma.TransactionClient;
    return operation(transaction);
  },
}));

import type { CurrentUser } from "@/server/auth/current-user";
import {
  adminMutationRequestHash,
  executeAdminMutation,
  normalizeAdminIdempotencyKey,
} from "@/server/services/admin/idempotency";
import { canonicalJson } from "@/lib/canonical-json";

const user = {
  id: "admin-1",
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  sessionVersion: 2,
} as CurrentUser;

function request(key: string): Request {
  return new Request("https://booking.example/api/admin/vehicles", {
    method: "POST",
    headers: { "Idempotency-Key": key },
  });
}

beforeEach(() => { state.stored = null; });

describe("admin idempotency", () => {
  it("sorts object keys by UTF-16 code units, independent of locale", () => {
    expect(canonicalJson({ a: 1, Z: 2 })).toBe('{"Z":2,"a":1}');
  });
  it("returns a saved result on retry and rejects key reuse with another body", async () => {
    const operation = vi.fn(async () => ({ id: "vehicle-1" }));
    const common = {
      request: request("same-key"),
      requestId: "request-1",
      user,
      allowedRoles: [UserRole.ADMIN],
      operation,
    };
    await expect(executeAdminMutation({ ...common, body: { slug: "a", year: 2025 } }))
      .resolves.toEqual({ id: "vehicle-1" });
    await expect(executeAdminMutation({ ...common, body: { year: 2025, slug: "a" } }))
      .resolves.toEqual({ id: "vehicle-1" });
    expect(operation).toHaveBeenCalledTimes(1);
    await expect(executeAdminMutation({ ...common, body: { slug: "b" } }))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", status: 409 });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("never stores or replays secret-shaped response fields", async () => {
    const common = {
      request: request("sensitive-response"),
      requestId: "request-sensitive",
      user,
      body: { slug: "safe" },
      allowedRoles: [UserRole.ADMIN],
    };
    await expect(executeAdminMutation({
      ...common,
      operation: async () => ({ id: "user-1", user: { passwordHash: "secret" } }),
    })).rejects.toThrow(/sensitive field: passwordHash/);
    expect(state.stored).toBeNull();

    state.stored = {
      requestHash: adminMutationRequestHash(common.request, common.body),
      response: { id: "user-1", accessToken: "secret" },
    };
    await expect(executeAdminMutation({
      ...common,
      operation: async () => ({ id: "user-1" }),
    })).rejects.toThrow(/sensitive field: accessToken/);
  });

  it("includes method and path in the request hash and validates keys", () => {
    const original = request("key");
    const other = new Request("https://booking.example/api/admin/vehicles/one", {
      method: "PATCH",
    });
    expect(adminMutationRequestHash(original, { slug: "a" }))
      .not.toBe(adminMutationRequestHash(other, { slug: "a" }));
    expect(() => normalizeAdminIdempotencyKey(" ", "request-2"))
      .toThrowError();
  });
});
