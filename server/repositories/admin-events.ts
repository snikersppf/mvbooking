import { Prisma, type AuditLog } from "@prisma/client";

export type CreateAdminAuditInput = Readonly<{
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}>;

export interface AdminEventRepository {
  createAudit(
    transaction: Prisma.TransactionClient,
    input: CreateAdminAuditInput,
  ): Promise<AuditLog>;
}

export class PrismaAdminEventRepository implements AdminEventRepository {
  createAudit(
    transaction: Prisma.TransactionClient,
    input: CreateAdminAuditInput,
  ): Promise<AuditLog> {
    return transaction.auditLog.create({
      data: {
        userId: input.actorUserId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  }
}

export const adminEventRepository: AdminEventRepository =
  new PrismaAdminEventRepository();
