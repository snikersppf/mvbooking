import { expect, it, vi } from "vitest";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { CurrentUser } from "@/server/auth/current-user";
import { listBookingWorklist } from "@/server/services/admin/booking-worklist";
function harness() {
  const query = vi.fn().mockResolvedValueOnce([{ total: BigInt(21) }]).mockResolvedValueOnce([]);
  return { query, dependencies: { prisma: { $queryRaw: query } as unknown as PrismaClient,
    authorize: vi.fn().mockResolvedValue({ role: "MANAGER" } as CurrentUser) } };
}
it("includes only in-progress enquiries and pending/confirmed bookings by default", async () => {
  const { query, dependencies } = harness();
  expect(await listBookingWorklist({}, dependencies)).toMatchObject({ view: "active", total: 21, totalPages: 2 });
  const parameters = (query.mock.calls[1]![0] as Prisma.Sql).values;
  expect(parameters).toEqual(["PENDING", "CONFIRMED", "IN_PROGRESS", 0]);
  expect(parameters).not.toContain("NEW");
  expect(parameters).not.toContain("COMPLETED");
});
it("exposes terminal records only through the past view with bounded database pagination", async () => {
  const { query, dependencies } = harness();
  await listBookingWorklist({ view: "past", page: 3 }, dependencies);
  expect((query.mock.calls[1]![0] as Prisma.Sql).values).toEqual(["COMPLETED", "CANCELLED", "REJECTED", "REJECTED", "CANCELLED_BY_CUSTOMER", "NO_SHOW", "COMPLETED", "CLOSED", 40]);
});
it("rejects access before querying contacts and rejects invalid filters", async () => {
  const { query, dependencies } = harness();
  dependencies.authorize.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(listBookingWorklist({}, dependencies)).rejects.toThrow("Forbidden");
  expect(query).not.toHaveBeenCalled();
  await expect(listBookingWorklist({ view: "all" }, dependencies)).rejects.toThrow();
  await expect(listBookingWorklist({ page: 0 }, dependencies)).rejects.toThrow();
});
