import { describe, expect, it } from "vitest";
import {
  BOOKING_INPUT_LIMITS,
  createBookingInputSchema,
} from "@/server/validators/booking";

const validInput = {
  vehicleId: "vehicle_01",
  startDate: "2026-10-10T10:00:00+04:00",
  endDate: "2026-10-11T06:00:00Z",
  pickupLocation: " Tbilisi Airport ",
  returnLocation: " Batumi ",
  customerComment: " Child seat, please. ",
};

describe("createBookingInputSchema", () => {
  it("accepts Z/offset dates and normalizes text fields", () => {
    const result = createBookingInputSchema.parse(validInput);

    expect(result).toEqual({
      vehicleId: "vehicle_01",
      startDate: new Date("2026-10-10T06:00:00.000Z"),
      endDate: new Date("2026-10-11T06:00:00.000Z"),
      pickupLocation: "Tbilisi Airport",
      returnLocation: "Batumi",
      customerComment: "Child seat, please.",
    });
  });

  it.each(["2026-10-10T10:00:00", "2026-10-10"])(
    "rejects a date without an explicit offset: %s",
    (startDate) => {
      expect(
        createBookingInputSchema.safeParse({ ...validInput, startDate }).success,
      ).toBe(false);
    },
  );

  it("rejects invalid calendar dates and extra fields", () => {
    expect(
      createBookingInputSchema.safeParse({
        ...validInput,
        startDate: "2026-02-30T10:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      createBookingInputSchema.safeParse({ ...validInput, userId: "user_1" })
        .success,
    ).toBe(false);
  });

  it("enforces the customer comment length limit", () => {
    expect(
      createBookingInputSchema.safeParse({
        ...validInput,
        customerComment: "x".repeat(BOOKING_INPUT_LIMITS.customerComment),
      }).success,
    ).toBe(true);
    expect(
      createBookingInputSchema.safeParse({
        ...validInput,
        customerComment: "x".repeat(BOOKING_INPUT_LIMITS.customerComment + 1),
      }).success,
    ).toBe(false);
  });
});
