import { afterEach, expect, it, vi } from "vitest";
import { decryptTotpSecret, encryptTotpSecret } from "@/server/security/totp";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it("keeps fixture and dev-server MFA keys identical across config evaluations", async () => {
  vi.stubEnv("E2E_DATABASE_URL", "postgresql://test:test@localhost/mvbooking_test");
  vi.stubEnv("MFA_ENCRYPTION_KEY", "unrelated-inherited-value");
  vi.resetModules();
  const first = (await import("@/playwright.config")).default;
  const fixtureKey = process.env.MFA_ENCRYPTION_KEY;
  const encrypted = encryptTotpSecret("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "fixture-user");
  vi.resetModules();
  const second = (await import("@/playwright.config")).default;
  for (const config of [first, second]) {
    const server = config.webServer;
    if (!server || Array.isArray(server)) throw new Error("Expected one E2E dev server.");
    expect(server.env?.MFA_ENCRYPTION_KEY).toBe(fixtureKey);
    expect(decryptTotpSecret(encrypted, "fixture-user", { ...server.env, NODE_ENV: "test" })).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  }
  expect(process.env.MFA_ENCRYPTION_KEY).toBe(fixtureKey);
  expect(Buffer.from(fixtureKey!, "base64")).toHaveLength(32);
});
