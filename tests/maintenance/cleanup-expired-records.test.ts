import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { cleanupExpiredRecords } from "@/server/services/maintenance/cleanup-expired-records";

describe("cleanupExpiredRecords", () => {
  it("uses strict one-hour and 24-hour cutoffs", async () => {
    const rateLimitCounter = { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) };
    const adminMutationResult = { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) };
    const client = { rateLimitCounter, adminMutationResult } as unknown as Pick<
      PrismaClient,
      "rateLimitCounter" | "adminMutationResult"
    >;
    const now = new Date("2026-10-17T12:00:00.000Z");

    await expect(cleanupExpiredRecords(client, now)).resolves.toEqual({
      rateLimitCounters: 3,
      adminMutationResults: 2,
    });
    expect(rateLimitCounter.deleteMany).toHaveBeenCalledWith({
      where: { resetAt: { lt: new Date("2026-10-17T11:00:00.000Z") } },
    });
    expect(adminMutationResult.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2026-10-16T12:00:00.000Z") } },
    });
  });
});
