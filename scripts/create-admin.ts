import { getPrismaClient } from "@/server/db/prisma";
import { createFirstAdmin } from "@/server/services/admin/create-first-admin";

async function readPassword(): Promise<string> {
  if (process.stdin.isTTY) throw new Error("Supply the password through stdin, using a hidden prompt or a secret file.");
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    bytes += buffer.length;
    if (bytes > 258) throw new Error("Password input is too long.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main(): Promise<void> {
  const [email, name, ...extra] = process.argv.slice(2);
  if (!email || !name || extra.length) throw new Error("Usage: create-admin <email> <name>; password on stdin.");
  const password = await readPassword();
  const client = getPrismaClient();
  try {
    const result = await createFirstAdmin({ email, name, password }, client);
    process.stdout.write(result.created
      ? "First administrator created. Sign in using the supplied credentials.\n"
      : "Administrator already exists. Password and access were not changed.\n");
  } finally {
    await client.$disconnect();
  }
}

main().catch(() => {
  // Database errors and validation objects may include input; never dump them here.
  process.stderr.write("Administrator bootstrap failed. Check input, database access, and whether an administrator or this email already exists.\n");
  process.exitCode = 1;
});
