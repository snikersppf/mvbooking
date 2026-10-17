import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type CleanupExpiredRecordsResult = Readonly<{
  rateLimitCounters: number;
  adminMutationResults: number;
}>;

export async function cleanupExpiredRecords(
  client: Pick<PrismaClient, "rateLimitCounter" | "adminMutationResult"> = getPrismaClient(),
  now: Date = new Date(),
): Promise<CleanupExpiredRecordsResult> {
  if (Number.isNaN(now.getTime())) throw new TypeError("Invalid cleanup time.");

  const [counters, mutations] = await Promise.all([
    client.rateLimitCounter.deleteMany({
      where: { resetAt: { lt: new Date(now.getTime() - HOUR_MS) } },
    }),
    client.adminMutationResult.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - DAY_MS) } },
    }),
  ]);

  return {
    rateLimitCounters: counters.count,
    adminMutationResults: mutations.count,
  };
}
