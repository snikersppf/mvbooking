import { getPrismaClient } from "@/server/db/prisma";
import { checkProductionData, productionImageOrigin } from "@/server/services/maintenance/production-data";

async function main(): Promise<void> {
  const origin = productionImageOrigin(process.env.VEHICLE_IMAGE_ORIGIN);
  const client = getPrismaClient();
  try {
    const report = await checkProductionData(client, origin);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.ok) process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}

main().catch(() => {
  // Driver errors may contain connection strings or other confidential values.
  process.stderr.write("Production data check failed. Verify DATABASE_URL, VEHICLE_IMAGE_ORIGIN and database access.\n");
  process.exitCode = 1;
});
