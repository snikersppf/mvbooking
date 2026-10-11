import { describe, expect, it } from "vitest";
import { BOOKING_CONFIG } from "@/server/config/booking";
import {
  calculateBookingDays,
  formatBookingCalendarDate,
} from "@/server/services/booking/dates";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function interval(start: string, end: string) {
  return { startDate: new Date(start), endDate: new Date(end) };
}

describe("booking configuration", () => {
  it("uses the approved MVP limits", () => {
    expect(BOOKING_CONFIG).toEqual({
      gracePeriodMs: 0,
      availabilityBufferMs: 0,
      maxDurationDays: 365,
      maxActivePendingPerUser: 3,
      displayTimeZone: "Asia/Tbilisi",
    });
  });
});

describe("calculateBookingDays", () => {
  it("counts exactly 24 hours as one day", () => {
    expect(
      calculateBookingDays(
        interval("2026-02-01T10:00:00Z", "2026-02-02T10:00:00Z"),
        NOW,
      ),
    ).toBe(1);
  });

  it("rounds 24 hours and one minute up to two days", () => {
    expect(
      calculateBookingDays(
        interval("2026-02-01T10:00:00Z", "2026-02-02T10:01:00Z"),
        NOW,
      ),
    ).toBe(2);
  });

  it("rejects a non-positive interval", () => {
    expect(() =>
      calculateBookingDays(
        interval("2026-02-01T10:00:00Z", "2026-02-01T10:00:00Z"),
        NOW,
      ),
    ).toThrowError(/before booking end/);
  });

  it("rejects a start even one millisecond in the past because grace is zero", () => {
    expect(() =>
      calculateBookingDays(
        interval("2025-12-31T23:59:59.999Z", "2026-01-01T01:00:00Z"),
        NOW,
      ),
    ).toThrowError(/must not be in the past/);
  });

  it("allows 365 days and rejects any duration that rounds to 366", () => {
    expect(
      calculateBookingDays(
        interval("2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z"),
        NOW,
      ),
    ).toBe(365);

    expect(() =>
      calculateBookingDays(
        interval("2026-01-01T00:00:00Z", "2027-01-01T00:00:00.001Z"),
        NOW,
      ),
    ).toThrowError(/must not exceed 365 days/);
  });

  it("uses Asia/Tbilisi for display while elapsed duration remains one day", () => {
    const booking = interval(
      "2026-01-10T19:30:00Z",
      "2026-01-10T20:30:00Z",
    );

    expect(formatBookingCalendarDate(booking.startDate)).toBe("2026-01-10");
    expect(formatBookingCalendarDate(booking.endDate)).toBe("2026-01-11");
    expect(calculateBookingDays(booking, NOW)).toBe(1);
  });
});
