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

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: requireDatabaseUrl() });
  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (!prismaGlobal.mvbookingPrisma) {
    prismaGlobal.mvbookingPrisma = createPrismaClient();
  }

  return prismaGlobal.mvbookingPrisma;
}
