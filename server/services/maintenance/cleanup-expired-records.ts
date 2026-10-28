import { ARCHIVED_LEAD_STATUSES } from "@/lib/lead-status";
import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type CleanupExpiredRecordsResult = Readonly<{
  rateLimitCounters: number;
  adminMutationResults: number;
  closedLeads: number;
}>;

export async function cleanupExpiredRecords(
  client: Pick<PrismaClient, "rateLimitCounter" | "adminMutationResult" | "lead"> = getPrismaClient(),
  now: Date = new Date(),
): Promise<CleanupExpiredRecordsResult> {
  if (Number.isNaN(now.getTime())) throw new TypeError("Invalid cleanup time.");

  const [counters, mutations, leads] = await Promise.all([
    client.rateLimitCounter.deleteMany({
      where: { resetAt: { lt: new Date(now.getTime() - HOUR_MS) } },
    }),
    client.adminMutationResult.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - DAY_MS) } },
    }),
    client.lead.deleteMany({ where: { status: { in: [...ARCHIVED_LEAD_STATUSES] }, updatedAt: { lt: leadRetentionCutoff(now) } } }),
  ]);

  return {
    rateLimitCounters: counters.count,
    adminMutationResults: mutations.count,
    closedLeads: leads.count,
  };
}

export function leadRetentionCutoff(now: Date): Date {
  if (Number.isNaN(now.getTime())) throw new TypeError("Invalid retention time.");
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(now.getUTCFullYear() - 1);
  // Clamp leap-day anniversaries to February's last day.
  if (cutoff.getUTCMonth() !== now.getUTCMonth()) cutoff.setUTCDate(0);
  return cutoff;
}
