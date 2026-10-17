import { getPrismaClient } from "@/server/db/prisma";
import type { RateLimitInput, RateLimitResult, RateLimitStore } from "./types";

type CounterRow = Readonly<{ count: number; retryAfterMs: bigint }>;

export class PostgresRateLimitStore implements RateLimitStore {
  private operations = 0;

  async consume(input: RateLimitInput): Promise<RateLimitResult> {
    if (
      !input.key || input.key.length > 191 ||
      !Number.isSafeInteger(input.limit) || input.limit < 1 ||
      !Number.isSafeInteger(input.windowMs) || input.windowMs < 1
    ) {
      throw new TypeError("Invalid rate-limit input.");
    }

    const prisma = getPrismaClient();
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

    this.operations += 1;
    if (this.operations % 256 === 0) {
      await prisma.$executeRaw`
        DELETE FROM "RateLimitCounter"
        WHERE "key" IN (
          SELECT "key" FROM "RateLimitCounter"
          WHERE "resetAt" < clock_timestamp() - INTERVAL '1 hour'
          ORDER BY "resetAt" LIMIT 100
        )
      `;
    }

    return {
      allowed: row.count <= input.limit,
      remaining: Math.max(0, input.limit - row.count),
      retryAfterMs: Math.max(0, Number(row.retryAfterMs)),
    };
  }
}
