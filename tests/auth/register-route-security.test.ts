import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/register/route";

const APP_ORIGIN = "https://booking.example";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("registration request security", () => {
  it("returns 403 before registration for a foreign origin", async () => {
    vi.stubEnv("APP_ORIGIN", APP_ORIGIN);

    const response = await POST(
      new Request(`${APP_ORIGIN}/api/auth/register`, {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNTRUSTED_ORIGIN" },
    });
  });

  it("returns 415 before registration for a non-JSON request", async () => {
    vi.stubEnv("APP_ORIGIN", APP_ORIGIN);

    const response = await POST(
      new Request(`${APP_ORIGIN}/api/auth/register`, {
        method: "POST",
        headers: {
          origin: APP_ORIGIN,
          "content-type": "text/plain",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNSUPPORTED_MEDIA_TYPE" },
    });
  });
});
