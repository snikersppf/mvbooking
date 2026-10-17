import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/server/config/auth";
import { assertCronAuthorization } from "@/server/security/cron-auth";

describe("cron authorization", () => {
  const secret = "s".repeat(32);

  it("fails closed without a configured secret", () => {
    expect(() => assertCronAuthorization(null, "")).toThrow(ConfigurationError);
    expect(() => assertCronAuthorization(null, "short")).toThrow(ConfigurationError);
  });

  it("requires an exact Bearer token", () => {
    expect(() => assertCronAuthorization(null, secret)).toThrowError();
    expect(() => assertCronAuthorization(`Basic ${secret}`, secret)).toThrowError();
    expect(() => assertCronAuthorization(`Bearer ${"x".repeat(32)}`, secret))
      .toThrowError();
    expect(() => assertCronAuthorization(`Bearer ${secret}`, secret)).not.toThrow();
  });
});
