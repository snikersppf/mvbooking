import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelExpired: vi.fn(async () => 2),
  requestReset: vi.fn(async () => undefined),
  confirmReset: vi.fn(async () => undefined),
}));

vi.mock("@/server/services/booking/cancel-expired-bookings", () => ({
  cancelExpiredPendingBookings: mocks.cancelExpired,
}));
vi.mock("@/server/services/users/password-reset", () => ({
  requestPasswordReset: mocks.requestReset,
  confirmPasswordReset: mocks.confirmReset,
}));
vi.mock("@/server/security/password-reset-rate-limit", () => ({
  enforcePasswordResetRateLimit: async () => undefined,
}));

import { POST as cancelExpired } from "@/app/api/cron/cancel-expired/route";
import { POST as requestReset } from "@/app/api/auth/password-reset/request/route";
import { POST as confirmReset } from "@/app/api/auth/password-reset/confirm/route";

const origin = "https://booking.example";

function jsonRequest(path: string, requestOrigin: string): Request {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify({ email: "user@example.com" }),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("stage 7 route security", () => {
  it("does not run cron without the correct bearer and returns its result with it", async () => {
    vi.stubEnv("CRON_SECRET", "s".repeat(32));
    const unauthorized = await cancelExpired(new Request(`${origin}/api/cron/cancel-expired`, {
      method: "POST",
    }));
    expect(unauthorized.status).toBe(401);
    expect(mocks.cancelExpired).not.toHaveBeenCalled();

    const authorized = await cancelExpired(new Request(`${origin}/api/cron/cancel-expired`, {
      method: "POST",
      headers: { authorization: `Bearer ${"s".repeat(32)}` },
    }));
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toMatchObject({ data: { cancelled: 2 } });
    expect(authorized.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects cross-origin reset requests before services run", async () => {
    vi.stubEnv("APP_ORIGIN", origin);
    const requestResponse = await requestReset(jsonRequest(
      "/api/auth/password-reset/request", "https://other.example",
    ));
    const confirmResponse = await confirmReset(jsonRequest(
      "/api/auth/password-reset/confirm", "https://other.example",
    ));
    expect(requestResponse.status).toBe(403);
    expect(confirmResponse.status).toBe(403);
    expect(mocks.requestReset).not.toHaveBeenCalled();
    expect(mocks.confirmReset).not.toHaveBeenCalled();
  });
});
