import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

describe("requireTestDatabaseUrl", () => {
  it("accepts only an explicitly configured *_test PostgreSQL database", () => {
    expect(
      requireTestDatabaseUrl({
        DATABASE_URL:
          "postgresql://mvbooking:password@localhost:5432/mvbooking_test?schema=public",
      }),
    ).toContain("mvbooking_test");
  });

  it("refuses a missing URL and a development database", () => {
    expect(() => requireTestDatabaseUrl({})).toThrowError(/explicit/);
    expect(() =>
      requireTestDatabaseUrl({
        DATABASE_URL:
          "postgresql://mvbooking:password@localhost:5432/mvbooking?schema=public",
      }),
    ).toThrowError(/must end with _test/);
  });
});
