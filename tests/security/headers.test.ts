import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import config from "@/next.config";

afterEach(() => vi.unstubAllEnvs());
it("applies same-origin browser policy to every route without external CSP sources", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const rules = await config.headers!();
  expect(rules[0]?.source).toBe("/:path*");
  const headers = Object.fromEntries(rules[0]!.headers.map(({ key, value }) => [key, value]));
  const csp = headers["Content-Security-Policy"]!;
  expect(csp).not.toMatch(/https?:|\*|unsafe-eval/);
  expect(csp).toContain("font-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["Permissions-Policy"]).toContain("camera=()");
  expect(readFileSync("deploy/Caddyfile", "utf8")).toContain('Strict-Transport-Security "max-age=31536000; includeSubDomains"');
});
