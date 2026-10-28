import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const runtimeUrl = process.env.RUNTIME_TEST_DATABASE_URL, migratorUrl = process.env.MIGRATOR_TEST_DATABASE_URL;
const runtime = runtimeUrl ? createPrismaClient(requireTestDatabaseUrl({ DATABASE_URL: runtimeUrl })) : null;
const migrator = migratorUrl ? createPrismaClient(requireTestDatabaseUrl({ DATABASE_URL: migratorUrl })) : null;
afterAll(async () => { await Promise.all([runtime?.$disconnect(), migrator?.$disconnect()]); });
describe.skipIf(!runtime || !migrator)("dedicated database roles", () => {
  it("permits runtime DML but refuses table creation, dropping and migration metadata", async () => {
    expect(new URL(runtimeUrl!).host).toBe(new URL(migratorUrl!).host);
    expect(new URL(runtimeUrl!).pathname).toBe(new URL(migratorUrl!).pathname);
    const id = `roles_it_${randomUUID().replaceAll("-", "")}`;
    const identifier = Prisma.raw(`"${id}"`), denied = Prisma.raw(`"${id}_denied"`);
    try {
      await migrator!.$executeRaw`CREATE TABLE public.${identifier} (id TEXT)`;
      await expect(runtime!.$executeRaw`DROP TABLE public.${identifier}`).rejects.toThrow();
      await expect(runtime!.$executeRaw`ALTER TABLE public.${identifier} ADD COLUMN denied TEXT`).rejects.toThrow();
      await expect(runtime!.$executeRaw`CREATE TABLE public.${denied} (id TEXT)`).rejects.toThrow();
      await expect(runtime!.$queryRaw`SELECT * FROM public."_prisma_migrations" LIMIT 1`).rejects.toThrow();
      const [privileges] = await runtime!.$queryRaw<Array<{ role: string; createSchema: boolean; createDatabase: boolean; temporary: boolean }>>`
        SELECT current_user AS role, has_schema_privilege(current_user, 'public', 'CREATE') AS "createSchema",
        has_database_privilege(current_user, current_database(), 'CREATE') AS "createDatabase",
        has_database_privilege(current_user, current_database(), 'TEMPORARY') AS temporary
      `;
      expect(privileges).toEqual({ role: "mvbooking_runtime", createSchema: false, createDatabase: false, temporary: false });
      await runtime!.lead.create({ data: { id, name: "Role test", phone: "+995555123456", consentVersion: "test", consentAt: new Date() } });
      await runtime!.lead.update({ where: { id }, data: { status: "COMPLETED" } });
      expect((await runtime!.lead.findUniqueOrThrow({ where: { id } })).status).toBe("COMPLETED");
      expect((await runtime!.lead.deleteMany({ where: { id } })).count).toBe(1);
    } finally {
      await migrator!.lead.deleteMany({ where: { id } });
      await migrator!.$executeRaw`DROP TABLE IF EXISTS public.${identifier}`;
      await migrator!.$executeRaw`DROP TABLE IF EXISTS public.${denied}`;
    }
  });
});
