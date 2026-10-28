import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  mvbookingPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function requireDatabaseUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  if (env.NODE_ENV === "production") {
    let valid = false;
    try {
      const url = new URL(connectionString);
      valid = ["postgres:", "postgresql:"].includes(url.protocol) && decodeURIComponent(url.username) === "mvbooking_runtime" && !env.MIGRATOR_DATABASE_URL;
    } catch { /* Connection strings must never appear in public errors or worker logs. */ }
    if (!valid) throw new Error("Production runtime requires isolated mvbooking_runtime credentials.");
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
