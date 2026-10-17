import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { PostgresRateLimitStore } from "@/server/security/rate-limit/postgres-store";
import {
  RateLimiter,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/server/security/rate-limit/rate-limiter";
import { cleanupExpiredRecords } from "@/server/services/maintenance/cleanup-expired-records";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const databaseUrl = requireTestDatabaseUrl();
const prisma = createPrismaClient(databaseUrl);
const prefixes: string[] = [];

function newPrefix(): string {
  const prefix = `rate_it_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  prefixes.push(prefix);
  return prefix;
}

async function cleanup(prefix: string): Promise<void> {
  await prisma.rateLimitCounter.deleteMany({ where: { key: { startsWith: prefix } } });
  await prisma.adminMutationResult.deleteMany({
    where: { actorUserId: { startsWith: prefix } },
  });
}

beforeAll(async () => { await prisma.$connect(); });
afterEach(async () => { await cleanupTrackedPrefixes(prefixes, cleanup); });
afterAll(async () => {
  try {
    await cleanupTrackedPrefixes(prefixes, cleanup);
  } finally {
    await prisma.$disconnect();
  }
});

describe("PostgresRateLimitStore integration", () => {
  it("enforces the limit and resets an expired window", async () => {
    const key = `${newPrefix()}:limit`;
    const limiter = new RateLimiter(new PostgresRateLimitStore(() => prisma));
    const input = { key, limit: 2, windowMs: 60_000 };

    await expect(limiter.check(input)).resolves.toBeUndefined();
    await expect(limiter.check(input)).resolves.toBeUndefined();
    await expect(limiter.check(input)).rejects.toBeInstanceOf(RateLimitExceededError);
    expect((await prisma.rateLimitCounter.findUniqueOrThrow({ where: { key } })).count)
      .toBe(3);

    await prisma.rateLimitCounter.update({
      where: { key },
      data: { resetAt: new Date(Date.now() - 1_000) },
    });
    await expect(limiter.check(input)).resolves.toBeUndefined();
    expect((await prisma.rateLimitCounter.findUniqueOrThrow({ where: { key } })).count)
      .toBe(1);
  });

  it("counts parallel requests exactly across store instances", async () => {
    const key = `${newPrefix()}:parallel`;
    const stores = [
      new PostgresRateLimitStore(() => prisma),
      new PostgresRateLimitStore(() => prisma),
    ];
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      stores[index % stores.length]!.consume({ key, limit: 7, windowMs: 60_000 }),
    ));

    expect(results.filter((result) => result.allowed)).toHaveLength(7);
    expect(results.filter((result) => !result.allowed)).toHaveLength(13);
    expect((await prisma.rateLimitCounter.findUniqueOrThrow({ where: { key } })).count)
      .toBe(20);
  });

  it("maps a PostgreSQL connection failure to typed 503", async () => {
    const unavailableUrl = new URL(databaseUrl);
    unavailableUrl.port = "1";
    const unavailableClient = createPrismaClient(unavailableUrl.toString());
    try {
      const limiter = new RateLimiter(new PostgresRateLimitStore(() => unavailableClient));
      await expect(limiter.check({
        key: `${newPrefix()}:unavailable`,
        limit: 1,
        windowMs: 60_000,
      })).rejects.toMatchObject({
        code: "RATE_LIMIT_UNAVAILABLE",
        status: 503,
        name: RateLimitUnavailableError.name,
      });
    } finally {
      await unavailableClient.$disconnect();
    }
  });
});

describe("expired operational records cleanup integration", () => {
  it("deletes only counters older than one hour and replays older than 24 hours", async () => {
    const prefix = newPrefix();
    const now = new Date("2026-10-17T12:00:00.000Z");
    const oldCounterKey = `${prefix}:counter:old`;
    const freshCounterKey = `${prefix}:counter:fresh`;
    await prisma.rateLimitCounter.createMany({ data: [
      { key: oldCounterKey, count: 1, resetAt: new Date(now.getTime() - 3_600_001) },
      { key: freshCounterKey, count: 1, resetAt: new Date(now.getTime() - 3_600_000) },
    ] });
    await prisma.adminMutationResult.createMany({ data: [
      {
        actorUserId: `${prefix}:actor`,
        idempotencyKey: "old",
        requestHash: "old",
        response: { id: "old" },
        createdAt: new Date(now.getTime() - 86_400_001),
      },
      {
        actorUserId: `${prefix}:actor`,
        idempotencyKey: "fresh",
        requestHash: "fresh",
        response: { id: "fresh" },
        createdAt: new Date(now.getTime() - 86_400_000),
      },
    ] });

    await cleanupExpiredRecords(prisma, now);

    expect(await prisma.rateLimitCounter.findUnique({ where: { key: oldCounterKey } }))
      .toBeNull();
    expect(await prisma.rateLimitCounter.findUnique({ where: { key: freshCounterKey } }))
      .not.toBeNull();
    expect(await prisma.adminMutationResult.findUnique({
      where: { actorUserId_idempotencyKey: {
        actorUserId: `${prefix}:actor`, idempotencyKey: "old",
      } },
    })).toBeNull();
    expect(await prisma.adminMutationResult.findUnique({
      where: { actorUserId_idempotencyKey: {
        actorUserId: `${prefix}:actor`, idempotencyKey: "fresh",
      } },
    })).not.toBeNull();
  });
});
