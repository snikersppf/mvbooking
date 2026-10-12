import { describe, expect, it } from "vitest";
import {
  accountBookingsPageHref,
  canCustomerCancelBooking,
  formatBookingDateTime,
  formatBookingStatus,
} from "@/lib/booking-view";

describe("customer booking presentation", () => {
  it("allows cancellation only for an unpaid pending booking", () => {
    expect(canCustomerCancelBooking("PENDING", "UNPAID")).toBe(true);
    expect(canCustomerCancelBooking("CONFIRMED", "UNPAID")).toBe(false);
    expect(canCustomerCancelBooking("PENDING", "PAID")).toBe(false);
  });

  it("formats dates in the configured display time zone", () => {
    expect(
      formatBookingDateTime(
        "2026-10-10T20:00:00.000Z",
        "Asia/Tbilisi",
      ),
    ).toContain("Oct 11, 2026");
  });

  it("formats status labels and pagination links", () => {
    expect(formatBookingStatus("PENDING")).toBe("Pending");
    expect(formatBookingStatus("PAYMENT_PENDING")).toBe("Payment Pending");
    expect(accountBookingsPageHref(3)).toBe("/account/bookings?page=3");
  });
});
