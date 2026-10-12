import { Prisma, type PrismaClient } from "@prisma/client";

type ReadClient = PrismaClient | Prisma.TransactionClient;

export const adminAuditLogSelect = {
  id: true,
  userId: true,
  action: true,
  entity: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  user: {
    select: { id: true, name: true, email: true, role: true },
  },
} satisfies Prisma.AuditLogSelect;

export type AdminAuditLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof adminAuditLogSelect;
}>;

export type AdminAuditLogFilters = Readonly<{
  userId?: string;
  action?: string;
  entity?: string;
}>;

export interface AuditLogRepository {
  count(client: ReadClient, filters: AdminAuditLogFilters): Promise<number>;
  findMany(
    client: ReadClient,
    filters: AdminAuditLogFilters,
    offset: number,
    limit: number,
  ): Promise<AdminAuditLogRecord[]>;
}

function auditWhere(filters: AdminAuditLogFilters): Prisma.AuditLogWhereInput {
  return {
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entity ? { entity: filters.entity } : {}),
  };
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  count(client: ReadClient, filters: AdminAuditLogFilters): Promise<number> {
    return client.auditLog.count({ where: auditWhere(filters) });
  }

  findMany(
    client: ReadClient,
    filters: AdminAuditLogFilters,
    offset: number,
    limit: number,
  ): Promise<AdminAuditLogRecord[]> {
    return client.auditLog.findMany({
      where: auditWhere(filters),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: adminAuditLogSelect,
    });
  }
}

export const auditLogRepository: AuditLogRepository =
  new PrismaAuditLogRepository();
