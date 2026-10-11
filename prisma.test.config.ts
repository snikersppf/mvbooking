import { defineConfig } from "prisma/config";
import { requireTestDatabaseUrl } from "./server/config/test-database";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: requireTestDatabaseUrl(),
  },
});
