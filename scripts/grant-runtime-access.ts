import { readFileSync } from "node:fs";
import { createPrismaClient } from "@/server/db/prisma";

async function main(): Promise<void> {
  const url = process.env.MIGRATOR_DATABASE_URL;
  if (!url) throw new Error("MIGRATOR_DATABASE_URL is required.");
  const prisma = createPrismaClient(url);
  try {
    // Trusted, tracked SQL only. Only this operator command consumes MIGRATOR_DATABASE_URL.
    await prisma.$executeRawUnsafe(readFileSync(new URL("../deploy/grant-runtime-access.sql", import.meta.url), "utf8"));
    process.stdout.write("Runtime data permissions applied.\n");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => {
  process.stderr.write("Runtime permissions failed; do not start the application.\n");
  process.exitCode = 1;
});
