import { VehicleStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { bookingIntervalsOverlap } from "@/server/services/booking/intervals";
import { assertVehicleAvailable } from "@/server/services/booking/vehicle";

function interval(start: string, end: string) {
  return { startDate: new Date(start), endDate: new Date(end) };
}

describe("bookingIntervalsOverlap", () => {
  it("treats adjacent half-open intervals as non-overlapping", () => {
    expect(
      bookingIntervalsOverlap(
        interval("2026-02-01T10:00:00Z", "2026-02-02T10:00:00Z"),
        interval("2026-02-02T10:00:00Z", "2026-02-03T10:00:00Z"),
      ),
    ).toBe(false);
  });

  it("detects overlap regardless of argument order", () => {
    const first = interval(
      "2026-02-01T10:00:00Z",
      "2026-02-02T10:00:00Z",
    );
    const second = interval(
      "2026-02-02T09:59:59Z",
      "2026-02-03T10:00:00Z",
    );

    expect(bookingIntervalsOverlap(first, second)).toBe(true);
    expect(bookingIntervalsOverlap(second, first)).toBe(true);
  });
});

describe("assertVehicleAvailable", () => {
  it("allows only AVAILABLE vehicles", () => {
    expect(() => assertVehicleAvailable(VehicleStatus.AVAILABLE)).not.toThrow();

    for (const status of [
      VehicleStatus.UNAVAILABLE,
      VehicleStatus.MAINTENANCE,
      VehicleStatus.ARCHIVED,
    ]) {
      expect(() => assertVehicleAvailable(status)).toThrowError(
        /Only an available vehicle/,
      );
    }
  });
});
