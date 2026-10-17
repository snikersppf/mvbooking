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
