import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiErrorResponse,
  describeApiError,
  jsonData,
  PRIVATE_NO_STORE,
} from "@/server/http/api-response";
import { RateLimitExceededError } from "@/server/security/rate-limit/rate-limiter";
import { BookingServiceError } from "@/server/services/booking/service-errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API response contract", () => {
  it("maps validation failures to field errors", () => {
    const schema = z.object({ page: z.coerce.number().int().positive() });
    const result = schema.safeParse({ page: "invalid" });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(describeApiError(result.error)).toEqual({
      status: 400,
      code: "VALIDATION_ERROR",
      messageKey: "errors.validation",
      fieldErrors: { page: [expect.any(String)] },
    });
  });

  it("hides an ownership failure behind BOOKING_NOT_FOUND", () => {
    const error = new BookingServiceError(
      "BOOKING_FORBIDDEN",
      403,
      "Sensitive ownership detail.",
      "service-request-id",
    );

    expect(describeApiError(error)).toEqual({
      status: 404,
      code: "BOOKING_NOT_FOUND",
      messageKey: "errors.bookingNotFound",
    });
  });

  it("returns the uniform error body and retry header", async () => {
    const response = apiErrorResponse(
      "POST /api/bookings",
      new RateLimitExceededError(1_001),
      "request-123",
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    expect(response.headers.get("x-request-id")).toBe("request-123");
    expect(response.headers.get("retry-after")).toBe("2");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        messageKey: "errors.rateLimitExceeded",
        requestId: "request-123",
      },
    });
  });

  it("wraps successful data with cache and request headers", async () => {
    const response = jsonData(
      { id: "vehicle-1" },
      {
        status: 201,
        cacheControl: PRIVATE_NO_STORE,
        requestId: "request-456",
      },
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe(PRIVATE_NO_STORE);
    expect(response.headers.get("x-request-id")).toBe("request-456");
    await expect(response.json()).resolves.toEqual({
      data: { id: "vehicle-1" },
    });
  });

  it("logs only a safe summary for an unknown failure", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = apiErrorResponse(
      "GET /api/vehicles",
      new Error("database unavailable"),
      "request-789",
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        messageKey: "errors.internal",
        requestId: "request-789",
      },
    });
    expect(consoleError).toHaveBeenCalledWith("Route handler failed", {
      route: "GET /api/vehicles",
      errorName: "Error",
      errorMessage: "database unavailable",
    });
  });
});
