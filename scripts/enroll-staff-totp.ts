import { createInterface } from "node:readline/promises";
import { getPrismaClient } from "@/server/db/prisma";
import { generateTotpSecret } from "@/server/security/totp";
import { enrollStaffTotp } from "@/server/services/staff/totp";

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run interactively with the staff email argument.");
  const secret = generateTotpSecret();
  // Explicit operator output only: never run this command under a log collector.
  const uri = `otpauth://totp/${encodeURIComponent(`MVBooking:${email}`)}?secret=${secret}&issuer=MVBooking&algorithm=SHA1&digits=6&period=30`;
  process.stdout.write(`Add this secret to your authenticator: ${secret}\n${uri}\n`);
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const prisma = getPrismaClient();
  try {
    const code = (await terminal.question("Current 6-digit authenticator code: ")).trim();
    const codes = await enrollStaffTotp(email, secret, code, prisma);
    process.stdout.write(`Save these one-use backup codes offline (shown once):\n${codes.join("\n")}\nWait for the next authenticator code before signing in.\n`);
  } finally { terminal.close(); await prisma.$disconnect(); }
}
main().catch((e) => {
  process.stderr.write(`failed: ${e instanceof Error ? e.name + ": " + e.message : "unknown"}\n`);
  process.exitCode = 1;
});
