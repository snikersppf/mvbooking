import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function validate(overrides: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, ["scripts/validate-production-config.mjs"], {
    encoding: "utf8",
    env: {
      NODE_ENV: "production",
      MFA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
      APP_ORIGIN: "https://booking.example.org",
      AUTH_URL: "https://booking.example.org",
      TRUST_PROXY_HEADERS: "true",
      AUTH_SECRET: "test-auth-secret-that-is-long-enough",
      CRON_SECRET: "test-cron-secret-that-is-long-enough",
      DATABASE_URL: "postgresql://mvbooking_runtime:test-only@db:5432/mvbooking",
      ...overrides,
    },
  });
}

describe("production startup configuration", () => {
  it("limits request bodies on the only public ingress, including auth and admin JSON", () => {
    const caddyfile = readFileSync(new URL("../../deploy/Caddyfile", import.meta.url), "utf8")
      .replace(/^\s*#.*$/gm, "");
    // This is a static configuration regression check, not a live Caddy/413 test.
    // No path matcher means the cap covers all paths before forwarding to Next.
    expect(caddyfile).toMatch(/request_body\s*\{\s*max_size 1MB\s*\}/);
    expect(caddyfile).toContain("reverse_proxy app:3000");
  });

  it("accepts matching HTTPS origins behind the private proxy", () => {
    expect(validate().status).toBe(0);
  });
  it.each([
    { APP_ORIGIN: "http://booking.example.org" },
    { AUTH_URL: "https://different.example.org" },
    { APP_ORIGIN: "https://localhost" },
    { APP_ORIGIN: "https://127.0.0.1" },
    { APP_ORIGIN: "https://booking.example.org/" },
    { TRUST_PROXY_HEADERS: "false" },
    { CRON_SECRET: "" },
    { MFA_ENCRYPTION_KEY: "invalid" },
    { DATABASE_URL: "postgresql://mvbooking_migrator:test-only@db:5432/mvbooking" },
    { MIGRATOR_DATABASE_URL: "configured-only-in-migration-container" },
  ])("rejects unsafe production config %j", (configuration) => {
    expect(validate(configuration).status).toBe(1);
  });
  it("does not echo malformed configuration secrets", () => {
    const value = "private-value-invalid-url";
    const result = validate({ APP_ORIGIN: value });
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain(value);
  });
});
