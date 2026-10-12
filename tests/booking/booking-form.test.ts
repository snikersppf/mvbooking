import { describe, expect, it, vi } from "vitest";
import {
  BookingApiError,
  describeBookingRequestFailure,
  requestVehicleQuote,
  submitBooking,
} from "@/components/booking/api-client";
import {
  bookingPayloadFingerprint,
  createBookingFormSchema,
  toCreateBookingPayload,
} from "@/components/booking/form-schema";
import { resolveIdempotencyEntry } from "@/components/booking/idempotency";
import { bookingLocalDateTimeToIso } from "@/lib/booking-calendar";

const DISPLAY_TIME_ZONE = "Asia/Tbilisi";
const NOW = new Date("2026-10-12T00:00:00.000Z");
const validValues = {
  startDate: "2026-10-20T10:00",
  endDate: "2026-10-23T10:00",
  pickupLocation: " Tbilisi Airport ",
  returnLocation: " Freedom Square ",
  customerComment: " Window seat, if applicable. ",
};

function schema() {
  return createBookingFormSchema({
    displayTimeZone: DISPLAY_TIME_ZONE,
    maxDurationDays: 365,
    now: NOW,
  });
}

describe("booking form schema", () => {
  it("accepts and trims a valid form", () => {
    expect(schema().parse(validValues)).toEqual({
      startDate: "2026-10-20T10:00",
      endDate: "2026-10-23T10:00",
      pickupLocation: "Tbilisi Airport",
      returnLocation: "Freedom Square",
      customerComment: "Window seat, if applicable.",
    });
  });

  it("rejects unknown fields", () => {
    expect(
      schema().safeParse({ ...validValues, userId: "another-user" }).success,
    ).toBe(false);
  });

  it.each([
    {
      name: "an invalid calendar date",
      values: { ...validValues, startDate: "2026-02-31T10:00" },
    },
    {
      name: "a start time in the past",
      values: { ...validValues, startDate: "2026-10-11T10:00" },
    },
    {
      name: "an end before the start",
      values: {
        ...validValues,
        startDate: "2026-10-23T10:00",
        endDate: "2026-10-20T10:00",
      },
    },
    {
      name: "a period longer than 365 days",
      values: {
        ...validValues,
        endDate: "2027-10-20T10:01",
      },
    },
    {
      name: "an empty pickup location",
      values: { ...validValues, pickupLocation: " " },
    },
    {
      name: "an oversized comment",
      values: { ...validValues, customerComment: "x".repeat(2_001) },
    },
  ])("rejects $name", ({ values }) => {
    expect(schema().safeParse(values).success).toBe(false);
  });

  it("converts Tbilisi wall time to an ISO instant without a fixed offset", () => {
    expect(
      bookingLocalDateTimeToIso(
        "2026-10-11T00:00",
        DISPLAY_TIME_ZONE,
      ),
    ).toBe("2026-10-10T20:00:00.000Z");
  });

  it("builds the API payload and omits an empty comment", () => {
    const parsed = schema().parse({
      ...validValues,
      customerComment: " ",
    });
    expect(
      toCreateBookingPayload("vehicle-1", parsed, DISPLAY_TIME_ZONE),
    ).toEqual({
      vehicleId: "vehicle-1",
      startDate: "2026-10-20T06:00:00.000Z",
      endDate: "2026-10-23T06:00:00.000Z",
      pickupLocation: "Tbilisi Airport",
      returnLocation: "Freedom Square",
    });
  });
});

describe("booking form request helpers", () => {
  it("reuses an idempotency key only for the same payload", () => {
    const createKey = vi
      .fn()
      .mockReturnValueOnce("key-1")
      .mockReturnValueOnce("key-2");
    const first = resolveIdempotencyEntry(null, "payload-a", createKey);
    const retry = resolveIdempotencyEntry(first, "payload-a", createKey);
    const changed = resolveIdempotencyEntry(first, "payload-b", createKey);

    expect(first.key).toBe("key-1");
    expect(retry).toBe(first);
    expect(changed.key).toBe("key-2");
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it("sends quote dates and the booking idempotency header", async () => {
    const quoteFetcher = vi.fn(async () =>
      Response.json({
        data: {
          vehicleId: "vehicle-1",
          startDate: "2026-10-20T06:00:00.000Z",
          endDate: "2026-10-23T06:00:00.000Z",
          available: true,
          quote: {
            totalDays: 3,
            pricePerDay: "90.00",
            totalAmount: "270.00",
            depositAmount: "300.00",
            totalDue: "570.00",
            currency: "GEL",
          },
        },
      }),
    );
    await requestVehicleQuote(
      "toyota-rav4",
      {
        startDate: "2026-10-20T06:00:00.000Z",
        endDate: "2026-10-23T06:00:00.000Z",
      },
      quoteFetcher,
    );
    expect(quoteFetcher).toHaveBeenCalledWith(
      expect.stringContaining("/api/vehicles/toyota-rav4/quote?"),
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );

    const payload = toCreateBookingPayload(
      "vehicle-1",
      schema().parse(validValues),
      DISPLAY_TIME_ZONE,
    );
    const bookingFetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json(
          {
            data: {
              replayed: false,
              booking: {
                id: "booking-1",
              },
            },
          },
          { status: 201 },
        ),
    );
    await submitBooking(payload, "request-key", bookingFetcher);
    const [, init] = bookingFetcher.mock.calls[0];
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
      "request-key",
    );
    expect(init?.body).toBe(JSON.stringify(payload));
    expect(bookingPayloadFingerprint(payload)).toBe(JSON.stringify(payload));
  });

  it.each([
    {
      error: new BookingApiError(
        409,
        "VEHICLE_UNAVAILABLE",
        "request-1",
        null,
      ),
      expected: "no longer available",
      signIn: false,
    },
    {
      error: new BookingApiError(
        401,
        "AUTHENTICATION_REQUIRED",
        "request-2",
        null,
      ),
      expected: "Sign in",
      signIn: true,
    },
    {
      error: new BookingApiError(
        429,
        "RATE_LIMIT_EXCEEDED",
        "request-3",
        12,
      ),
      expected: "12 seconds",
      signIn: false,
    },
  ])(
    "maps $error.status responses to a clear message",
    ({ error, expected, signIn }) => {
      const failure = describeBookingRequestFailure(error, "create");
      expect(failure.message).toContain(expected);
      expect(failure.requiresSignIn).toBe(signIn);
    },
  );
});
