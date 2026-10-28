import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { cleanupExpiredRecords, leadRetentionCutoff } from "@/server/services/maintenance/cleanup-expired-records";

describe("cleanupExpiredRecords", () => {
  it("uses strict one-hour and 24-hour cutoffs", async () => {
    const rateLimitCounter = { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) };
    const adminMutationResult = { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) };
    const lead = { deleteMany: vi.fn().mockResolvedValue({ count: 4 }) };
    const client = { rateLimitCounter, adminMutationResult, lead } as unknown as Pick<
      PrismaClient,
      "rateLimitCounter" | "adminMutationResult" | "lead"
    >;
    const now = new Date("2026-10-17T12:00:00.000Z");

    await expect(cleanupExpiredRecords(client, now)).resolves.toEqual({
      rateLimitCounters: 3,
      adminMutationResults: 2,
      closedLeads: 4,
    });
    expect(lead.deleteMany).toHaveBeenCalledWith({ where: { status: { in: ["REJECTED", "CANCELLED_BY_CUSTOMER", "NO_SHOW", "COMPLETED", "CLOSED"] }, updatedAt: { lt: new Date("2025-10-17T12:00:00Z") } } });
    expect(rateLimitCounter.deleteMany).toHaveBeenCalledWith({
      where: { resetAt: { lt: new Date("2026-10-17T11:00:00.000Z") } },
    });
    expect(adminMutationResult.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2026-10-16T12:00:00.000Z") } },
    });
  });
});

it("uses calendar months and clamps leap day for lead retention", () => {
  expect(leadRetentionCutoff(new Date("2028-02-29T12:00:00Z")).toISOString()).toBe("2027-02-28T12:00:00.000Z");
  expect(() => leadRetentionCutoff(new Date("invalid"))).toThrow();
});
