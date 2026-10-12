import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  auditLogRepository,
  type AuditLogRepository,
} from "@/server/repositories/audit-logs";
import {
  buildAdminPage,
  toAdminAuditLogDto,
  type AdminAuditLogDto,
  type AdminPage,
} from "@/server/services/admin/dto";
import { adminAuditLogListQuerySchema } from "@/server/validators/admin";

export type AdminAuditLogDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: AuditLogRepository;
}>;

export async function listAdminAuditLogs(
  input: unknown,
  dependencies: AdminAuditLogDependencies = {},
): Promise<AdminPage<AdminAuditLogDto>> {
  const query = adminAuditLogListQuerySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? auditLogRepository;
  const filters = {
    userId: query.userId,
    action: query.action,
    entity: query.entity,
  };
  const offset = (query.page - 1) * query.pageSize;
  const [totalItems, auditLogs] = await Promise.all([
    repository.count(prisma, filters),
    repository.findMany(prisma, filters, offset, query.pageSize),
  ]);
  return buildAdminPage(
    auditLogs.map(toAdminAuditLogDto),
    query.page,
    query.pageSize,
    totalItems,
  );
}
