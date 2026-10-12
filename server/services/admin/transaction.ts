import { Prisma, type PrismaClient } from "@prisma/client";

export function runAdminTransaction<T>(
  prisma: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(operation, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5_000,
    timeout: 5_000,
  });
}
