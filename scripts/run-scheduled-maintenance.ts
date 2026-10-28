import { getPrismaClient } from "@/server/db/prisma";
import { cleanupExpiredRecords } from "@/server/services/maintenance/cleanup-expired-records";

async function main(): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32 || /\s/.test(secret)) {
    throw new Error("Invalid cron configuration.");
  }
  // Fixed Compose-network destination; never send the bearer token to an arbitrary URL.
  const response = await fetch("http://app:3000/api/cron/cancel-expired", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    redirect: "error",
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new Error("Booking expiration failed.");
  const client = getPrismaClient();
  try {
    const result = await cleanupExpiredRecords(client);
    process.stdout.write(`Scheduled maintenance completed: ${JSON.stringify(result)}\n`);
  } finally {
    await client.$disconnect();
  }
}

main().catch(() => {
  process.stderr.write("Scheduled maintenance failed; inspect application health and cron configuration.\n");
  process.exitCode = 1;
});
