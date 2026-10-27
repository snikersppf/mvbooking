import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";
import { cleanupTrackedPrefixes } from "@/tests/integration/cleanup";

const prisma = createPrismaClient(requireTestDatabaseUrl());
const prefixes: string[] = [];
function fixture() {
  const id = `lead_it_${randomUUID()}`;
  prefixes.push(id);
  return { id, name: "Lead integration", consentVersion: "contact-v1", consentAt: new Date() };
}
async function cleanup(prefix: string) {
  await prisma.lead.deleteMany({ where: { id: { startsWith: prefix } } });
}
afterEach(() => cleanupTrackedPrefixes(prefixes, cleanup));
afterAll(async () => {
  try { await cleanupTrackedPrefixes(prefixes, cleanup); }
  finally { await prisma.$disconnect(); }
});

describe("Lead PostgreSQL constraints", () => {
  it("accepts either contact and defaults to NEW", async () => {
    expect((await prisma.lead.create({ data: { ...fixture(), email: "lead@example.test" } })).status).toBe("NEW");
    expect((await prisma.lead.create({ data: { ...fixture(), phone: "+995555123456" } })).status).toBe("NEW");
  });
  it("rejects missing and blank contacts even when bypassing application validation", async () => {
    await expect(prisma.lead.create({ data: fixture() })).rejects.toThrow();
    await expect(prisma.lead.create({ data: { ...fixture(), email: "  ", phone: " " } })).rejects.toThrow();
  });
  it("rejects reversed dates", async () => {
    await expect(prisma.lead.create({ data: {
      ...fixture(), email: "lead@example.test", startDate: new Date("2030-02-02"), endDate: new Date("2030-02-01"),
    } })).rejects.toThrow();
  });
});
