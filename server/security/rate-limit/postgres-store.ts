import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import type { RateLimitInput, RateLimitResult, RateLimitStore } from "./types";

type CounterRow = Readonly<{ count: number; retryAfterMs: bigint }>;

export class PostgresRateLimitStore implements RateLimitStore {
  constructor(
    private readonly clientProvider: () => Pick<PrismaClient, "$queryRaw"> = getPrismaClient,
  ) {}

  async consume(input: RateLimitInput): Promise<RateLimitResult> {
    if (
      !input.key || input.key.length > 191 ||
      !Number.isSafeInteger(input.limit) || input.limit < 1 ||
      !Number.isSafeInteger(input.windowMs) || input.windowMs < 1
    ) {
      throw new TypeError("Invalid rate-limit input.");
    }

    const prisma = this.clientProvider();
    const [row] = await prisma.$queryRaw<CounterRow[]>`
      INSERT INTO "RateLimitCounter" ("key", "count", "resetAt")
      VALUES (${input.key}, 1, clock_timestamp() + ${input.windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitCounter"."resetAt" <= clock_timestamp() THEN 1
          ELSE "RateLimitCounter"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitCounter"."resetAt" <= clock_timestamp()
            THEN clock_timestamp() + ${input.windowMs} * INTERVAL '1 millisecond'
          ELSE "RateLimitCounter"."resetAt"
        END
      RETURNING "count",
        GREATEST(0, EXTRACT(EPOCH FROM ("resetAt" - clock_timestamp())) * 1000)::bigint AS "retryAfterMs"
    `;
    if (!row) throw new Error("Rate-limit counter was not returned.");

    return {
      allowed: row.count <= input.limit,
      remaining: Math.max(0, input.limit - row.count),
      retryAfterMs: Math.max(0, Number(row.retryAfterMs)),
    };
  }
}
