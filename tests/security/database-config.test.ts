import { expect, it } from "vitest";
import { requireDatabaseUrl } from "@/server/db/prisma";
const runtime = "postgresql://mvbooking_runtime:unit-test-only@db:5432/mvbooking";
it("requires an explicit connection string", () => {
  expect(() => requireDatabaseUrl({})).toThrow("DATABASE_URL is required");
});
it("accepts the runtime role in production and keeps development configurable", () => {
  expect(requireDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: runtime })).toBe(runtime);
  expect(requireDatabaseUrl({ NODE_ENV: "test", DATABASE_URL: "postgresql://test:test@localhost/mvbooking_test" })).toContain("mvbooking_test");
});
it("rejects privileged runtime URLs without exposing credentials", () => {
  for (const value of [runtime.replace("mvbooking_runtime", "mvbooking_migrator"), "invalid-private-value"]) {
    expect(() => requireDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: value })).toThrow("requires isolated mvbooking_runtime credentials");
  }
});
it("rejects a migrator secret in the environment of any runtime client", () => {
  expect(() => requireDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: runtime, MIGRATOR_DATABASE_URL: "private-migrator-secret" })).toThrow("requires isolated mvbooking_runtime credentials");
});
