import { randomUUID } from "node:crypto";
import { LeadStatus, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import type { CurrentUser } from "@/server/auth/current-user";
import { getPrismaClient } from "@/server/db/prisma";
import { ApiRequestError } from "@/server/http/api-response";
import { lockUserById } from "@/server/repositories/users";
import { assertActiveAdminActor, MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";

export type LeadAdminDependencies = Readonly<{ prisma?: PrismaClient; authorize?: () => Promise<CurrentUser> }>;
const idSchema = z.string().min(1).max(128);
export const leadChangeSchema = z.object({ status: z.enum(LeadStatus), managerNote: z.string().trim().max(5000) }).strict();
export const leadListSchema = z.object({ status: z.enum(LeadStatus).optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
async function actor(dependencies: LeadAdminDependencies) {
  return (dependencies.authorize ?? (() => requireRole(MANAGER_ADMIN_ROLES)))();
}
export async function listLeads(input: unknown, dependencies: LeadAdminDependencies = {}) {
  await actor(dependencies);
  const query = leadListSchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const where = { status: query.status };
  const [items, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * 20, take: 20 }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page: query.page };
}
export async function getLead(id: string, dependencies: LeadAdminDependencies = {}) {
  await actor(dependencies);
  return (dependencies.prisma ?? getPrismaClient()).lead.findUnique({ where: { id: idSchema.parse(id) } });
}
export async function updateLead(id: string, input: unknown, dependencies: LeadAdminDependencies = {}) {
  const staff = await actor(dependencies);
  const data = leadChangeSchema.parse(input);
  idSchema.parse(id);
  return (dependencies.prisma ?? getPrismaClient()).$transaction(async (tx) => {
    const locked = await lockUserById(tx, staff.id);
    assertActiveAdminActor(locked, staff.sessionVersion, MANAGER_ADMIN_ROLES, randomUUID());
    await tx.$queryRaw`SELECT "id" FROM "Lead" WHERE "id" = ${id} FOR UPDATE`;
    const existing = await tx.lead.findUnique({ where: { id } });
    if (!existing) throw new ApiRequestError(404, "LEAD_NOT_FOUND", "errors.notFound");
    const result = await tx.lead.update({ where: { id }, data });
    await tx.auditLog.create({ data: {
      userId: staff.id, action: "LEAD_UPDATED", entity: "Lead", entityId: id,
      metadata: { previousStatus: existing.status, status: data.status, noteChanged: existing.managerNote !== data.managerNote },
    } });
    return result;
  });
}

export async function deleteLead(id: string, dependencies: LeadAdminDependencies = {}): Promise<void> {
  const staff = await (dependencies.authorize ?? (() => requireRole(["ADMIN"])))();
  idSchema.parse(id);
  await (dependencies.prisma ?? getPrismaClient()).$transaction(async (tx) => {
    const locked = await lockUserById(tx, staff.id);
    assertActiveAdminActor(locked, staff.sessionVersion, ["ADMIN"], randomUUID());
    await tx.$queryRaw`SELECT "id" FROM "Lead" WHERE "id" = ${id} FOR UPDATE`;
    // Idempotent delete: never copy contact data or notes to retained audit logs.
    const deleted = await tx.lead.deleteMany({ where: { id } });
    if (deleted.count) await tx.auditLog.create({ data: {
      userId: staff.id, action: "LEAD_DELETED", entity: "Lead", entityId: id,
    } });
  });
}
