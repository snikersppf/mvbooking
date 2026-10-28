import NextAuth from "next-auth";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("Auth.js runtime configuration", () => {
  it("imports without build secrets but still validates the secret on requests", async () => {
    vi.stubEnv("AUTH_SECRET", undefined);
    await expect(import("@/auth")).resolves.toBeDefined();

    const configure = vi.mocked(NextAuth).mock.calls[0]?.[0];
    expect(configure).toBeTypeOf("function");
    if (typeof configure !== "function") throw new Error("Expected lazy Auth.js configuration.");

    expect(() => configure(undefined)).toThrow("AUTH_SECRET must contain at least 32 bytes.");
    vi.stubEnv("AUTH_SECRET", "too-short");
    expect(() => configure(undefined)).toThrow("AUTH_SECRET must contain at least 32 bytes.");

    const runtimeSecret = "unit-test-runtime-secret".repeat(2);
    vi.stubEnv("AUTH_SECRET", runtimeSecret);
    expect(await configure(undefined)).toMatchObject({
      secret: runtimeSecret,
      session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
      jwt: { maxAge: 8 * 60 * 60 },
    });
  });
});
