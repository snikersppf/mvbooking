import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  mvbookingPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

function requireDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  return connectionString;
}

export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (!prismaGlobal.mvbookingPrisma) {
    prismaGlobal.mvbookingPrisma = createPrismaClient(requireDatabaseUrl());
  }

  return prismaGlobal.mvbookingPrisma;
}
