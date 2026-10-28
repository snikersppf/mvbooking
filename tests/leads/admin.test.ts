import { UserRole, UserStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/server/auth/current-user";
import { deleteLead, getLead, listLeads, reviewLead, updateLead } from "@/server/services/leads/admin";

const staff: CurrentUser = { id: "staff-1", name: "Manager", email: "manager@example.test", phone: null,
  role: UserRole.MANAGER, status: UserStatus.ACTIVE, sessionVersion: 2 };
function harness(role: UserRole = UserRole.MANAGER) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ ...staff, role }]),
    lead: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: "lead-1", status: "NEW", managerNote: "" }), update: vi.fn().mockResolvedValue({ id: "lead-1", status: "COMPLETED" }),
      findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    auditLog: { create: vi.fn() },
  };
  const prisma = { ...tx, $transaction: async (operation: (t: typeof tx) => Promise<unknown>) => operation(tx) } as unknown as PrismaClient;
  return { tx, dependencies: { prisma, authorize: vi.fn().mockResolvedValue(staff) } };
}
describe("staff enquiry services", () => {
  it("denies reads before touching stored contacts", async () => {
    const { tx, dependencies } = harness();
    dependencies.authorize.mockRejectedValue(new Error("Forbidden"));
    await expect(listLeads({}, dependencies)).rejects.toThrow("Forbidden");
    await expect(getLead("lead-1", dependencies)).rejects.toThrow("Forbidden");
    expect(tx.lead.findMany).not.toHaveBeenCalled();
    expect(tx.lead.findUnique).not.toHaveBeenCalled();
  });
  it("filters and bounds the list", async () => {
    const { tx, dependencies } = harness();
    await listLeads({ status: "NEW", page: 2 }, dependencies);
    expect(tx.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "NEW" }, take: 20, skip: 20 }));
    await expect(listLeads({ status: "unknown" }, dependencies)).rejects.toThrow();
  });
  it("records status and note changes atomically without storing note/contact text in audit", async () => {
    const { tx, dependencies } = harness();
    await updateLead("lead-1", { status: "COMPLETED", managerNote: "private note" }, dependencies);
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "LEAD_UPDATED", entityId: "lead-1", metadata: { previousStatus: "NEW", status: "COMPLETED", noteChanged: true },
    }) });
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("private note");
  });
  it("rejects a demoted actor inside the write transaction", async () => {
    const { tx, dependencies } = harness(UserRole.CUSTOMER);
    await expect(updateLead("lead-1", { status: "COMPLETED", managerNote: "" }, dependencies)).rejects.toMatchObject({ status: 403 });
    expect(tx.lead.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

it("allows deletion only to ADMIN, auditing only the deleted id", async () => {
  const manager = harness();
  await expect(deleteLead("lead-1", manager.dependencies)).rejects.toMatchObject({ status: 403 });
  expect(manager.tx.lead.deleteMany).not.toHaveBeenCalled();
  const admin = harness(UserRole.ADMIN);
  await deleteLead("lead-1", admin.dependencies);
  expect(admin.tx.auditLog.create).toHaveBeenCalledWith({ data: { userId: staff.id, action: "LEAD_DELETED", entity: "Lead", entityId: "lead-1" } });
});

it("marks a new enquiry reviewed once without changing a closed enquiry", async () => {
  const { tx, dependencies } = harness();
  tx.lead.update.mockResolvedValue({ id: "lead-1", status: "IN_PROGRESS" });
  await reviewLead("lead-1", dependencies);
  expect(tx.lead.update).toHaveBeenCalledWith({ where: { id: "lead-1" }, data: { status: "IN_PROGRESS" } });
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "LEAD_REVIEWED" }) });
  tx.lead.findUnique.mockResolvedValue({ id: "lead-1", status: "COMPLETED", managerNote: "" });
  await reviewLead("lead-1", dependencies);
  expect(tx.lead.update).toHaveBeenCalledTimes(1);
  expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
});

it("prevents returning a processed enquiry to the unreviewed queue", async () => {
  const { tx, dependencies } = harness();
  await expect(updateLead("lead-1", { status: "NEW", managerNote: "" }, dependencies)).rejects.toThrow();
  expect(tx.lead.update).not.toHaveBeenCalled();
});

it("rechecks the actor under lock before recording a review", async () => {
  const { tx, dependencies } = harness(UserRole.CUSTOMER);
  await expect(reviewLead("lead-1", dependencies)).rejects.toMatchObject({ status: 403 });
  expect(tx.lead.update).not.toHaveBeenCalled();
});

it.each(["REJECTED", "CANCELLED_BY_CUSTOMER", "NO_SHOW", "COMPLETED"])("supports the explicit outcome %s", async (status) => {
  const { tx, dependencies } = harness();
  await updateLead("lead-1", { status, managerNote: "" }, dependencies);
  expect(tx.lead.update).toHaveBeenCalledWith({ where: { id: "lead-1" }, data: { status, managerNote: "" } });
});
