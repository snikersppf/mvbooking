import { afterEach, expect, it, vi } from "vitest";
import { authorizeCredentialsForAuth } from "@/server/auth/credentials-provider";
import { authorizeCredentials } from "@/server/auth/credentials";
import { RateLimitExceededError, RateLimitUnavailableError } from "@/server/security/rate-limit/rate-limiter";

vi.mock("next-auth", async () => ({ CredentialsSignin: (await import("@auth/core/errors")).CredentialsSignin }));
vi.mock("@/server/auth/credentials", () => ({ authorizeCredentials: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const request = new Request("https://example.test/api/auth/callback/credentials");

it("maps throttling to a safe Auth.js credentials error without leaking retry state", async () => {
  vi.mocked(authorizeCredentials).mockRejectedValue(new RateLimitExceededError(123_456));
  await expect(authorizeCredentialsForAuth({}, request)).rejects.toMatchObject({
    type: "CredentialsSignin", code: "login_rate_limited",
  });
});

it("preserves infrastructure failures rather than weakening the rate limiter", async () => {
  const error = new RateLimitUnavailableError();
  vi.mocked(authorizeCredentials).mockRejectedValue(error);
  await expect(authorizeCredentialsForAuth({}, request)).rejects.toBe(error);
});

it("preserves rejection of invalid credentials", async () => {
  vi.mocked(authorizeCredentials).mockResolvedValue(null);
  await expect(authorizeCredentialsForAuth({}, request)).resolves.toBeNull();
});
