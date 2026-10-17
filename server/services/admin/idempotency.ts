import { createHash, randomUUID } from "node:crypto";
import type { Prisma, UserRole } from "@prisma/client";
import type { CurrentUser } from "@/server/auth/current-user";
import { canonicalJson } from "@/lib/canonical-json";
import { getPrismaClient } from "@/server/db/prisma";
import { ADMINISTRATION_LOCK_KEY } from "@/server/repositories/admin-users";
import { lockUserById } from "@/server/repositories/users";
import { runBookingTransaction } from "@/server/services/booking/transaction";
import { assertActiveAdminActor } from "./authorization";
import { AdminServiceError } from "./errors";
import { assertSafeAdminMutationResponse } from "./safe-mutation-response";

type StoredMutation = Readonly<{ requestHash: string; response: unknown }>;

type AdminMutationInput<T> = Readonly<{
  request: Request;
  requestId: string;
  user: CurrentUser;
  body: unknown;
  allowedRoles: readonly UserRole[];
  lockAdministrationUsers?: boolean;
  operation: (transaction?: Prisma.TransactionClient) => Promise<T>;
}>;

export function adminMutationRequestHash(request: Request, body: unknown): string {
  const payload = canonicalJson({
    method: request.method,
    path: new URL(request.url).pathname,
    body,
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function normalizeAdminIdempotencyKey(
  value: string | null,
  requestId: string,
): string | null {
  if (value === null) return null;
  const key = value.trim();
  if (key.length === 0 || key.length > 128) {
    throw new AdminServiceError(
      "IDEMPOTENCY_KEY_INVALID",
      400,
      "Idempotency key must contain between 1 and 128 characters.",
      requestId,
    );
  }
  return key;
}

export async function executeAdminMutation<T>(
  input: AdminMutationInput<T>,
): Promise<T> {
  const key = normalizeAdminIdempotencyKey(
    input.request.headers.get("idempotency-key"),
    input.requestId,
  );
  if (key === null) return input.operation();

  const requestHash = adminMutationRequestHash(input.request, input.body);
  return runBookingTransaction(getPrismaClient(), input.requestId, async (transaction) => {
    // The key lock serializes concurrent retries without locking unrelated keys.
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${`${input.user.id}:${key}`}, 0))
    `;
    // User role/status updates already use this lock before user row locks.
    if (input.lockAdministrationUsers) {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${ADMINISTRATION_LOCK_KEY}))
      `;
    }
    const actor = await lockUserById(transaction, input.user.id);
    assertActiveAdminActor(
      actor,
      input.user.sessionVersion,
      input.allowedRoles,
      input.requestId,
    );

    const [existing] = await transaction.$queryRaw<StoredMutation[]>`
      SELECT "requestHash", "response"
      FROM "AdminMutationResult"
      WHERE "actorUserId" = ${input.user.id}
        AND "idempotencyKey" = ${key}
    `;
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AdminServiceError(
          "IDEMPOTENCY_KEY_REUSED",
          409,
          "Idempotency key was already used for a different request.",
          input.requestId,
        );
      }
      assertSafeAdminMutationResponse(existing.response);
      return existing.response as T;
    }

    const result = await input.operation(transaction);
    assertSafeAdminMutationResponse(result);
    await transaction.$executeRaw`
      INSERT INTO "AdminMutationResult"
        ("id", "actorUserId", "idempotencyKey", "requestHash", "response", "createdAt")
      VALUES
        (${randomUUID()}, ${input.user.id}, ${key}, ${requestHash}, ${JSON.stringify(result)}::jsonb, clock_timestamp())
    `;
    return result;
  });
}
