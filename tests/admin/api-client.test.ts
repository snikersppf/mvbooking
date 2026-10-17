import { describe, expect, it, vi } from "vitest";
import {
  AdminApiError,
  applyAdminFieldErrors,
  describeAdminMutationFailure,
  requestAdminMutation,
} from "@/components/admin/api-client";

describe("admin API client", () => {
  it("sends same-origin JSON with the supplied idempotency key", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ data: { id: "vehicle-1" } }),
    );

    await expect(
      requestAdminMutation<{ id: string }>(
        {
          path: "/api/admin/vehicles",
          method: "POST",
          body: { slug: "vehicle-1" },
          idempotencyKey: "admin-test-key",
        },
        fetcher,
      ),
    ).resolves.toEqual({ id: "vehicle-1" });

    const [, init] = fetcher.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ slug: "vehicle-1" }),
    });
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("idempotency-key")).toBe("admin-test-key");
    expect(headers.has("origin")).toBe(false);
  });

  it("preserves API error details and presents known conflicts", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json(
          {
            error: {
              code: "LAST_ACTIVE_ADMIN",
              requestId: "request-1",
              fieldErrors: { role: ["Invalid role"] },
            },
          },
          { status: 409 },
        ),
    );

    let thrown: unknown;
    try {
      await requestAdminMutation(
        {
          path: "/api/admin/users/user-1/role",
          method: "PATCH",
          body: { role: "MANAGER" },
          idempotencyKey: "admin-test-key",
        },
        fetcher,
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AdminApiError);
    expect(thrown).toMatchObject({
      status: 409,
      code: "LAST_ACTIVE_ADMIN",
      requestId: "request-1",
      fieldErrors: { role: ["Invalid role"] },
    });
    expect(describeAdminMutationFailure(thrown)).toBe(
      "The final active administrator cannot be changed.",
    );
  });

  it("maps server field errors to React Hook Form paths", () => {
    const setError = vi.fn();
    const error = new AdminApiError(400, "VALIDATION_ERROR", "request-2", null, {
      "rules.0.minDays": ["Must be positive"],
    });
    expect(applyAdminFieldErrors(error, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith("rules.0.minDays", {
      type: "server",
      message: "Must be positive",
    });
  });
});
