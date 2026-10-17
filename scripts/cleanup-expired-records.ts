import { getPrismaClient } from "@/server/db/prisma";
import { cleanupExpiredRecords } from "@/server/services/maintenance/cleanup-expired-records";

async function main(): Promise<void> {
  const client = getPrismaClient();
  try {
    const result = await cleanupExpiredRecords(client);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}\n`);
  process.exitCode = 1;
});
