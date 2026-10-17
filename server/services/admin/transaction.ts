import { Prisma, type PrismaClient } from "@prisma/client";

export function runAdminTransaction<T>(
  prisma: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  existingTransaction?: Prisma.TransactionClient,
): Promise<T> {
  if (existingTransaction) return operation(existingTransaction);
  return prisma.$transaction(operation, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5_000,
    timeout: 5_000,
  });
}
