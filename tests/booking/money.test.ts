import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateBookingMoney,
  satisfiesBookingTotalAmountCheck,
} from "@/server/services/booking/money";

describe("calculateBookingMoney", () => {
  it("rounds 33.335 HALF_UP and preserves the total amount invariant", () => {
    const totalDays = 3;
    const result = calculateBookingMoney({
      pricePerDay: new Prisma.Decimal("33.335"),
      totalDays,
      depositAmount: new Prisma.Decimal("0.00"),
    });

    expect(result.pricePerDay.toFixed(2)).toBe("33.34");
    expect(result.totalAmount.toFixed(2)).toBe("100.02");
    expect(
      satisfiesBookingTotalAmountCheck({ ...result, totalDays }),
    ).toBe(true);
  });

  it("rounds HALF_UP with Prisma.Decimal and keeps deposit separate", () => {
    const result = calculateBookingMoney({
      pricePerDay: new Prisma.Decimal("12.345"),
      totalDays: 3,
      depositAmount: new Prisma.Decimal("100.005"),
    });

    expect(result.pricePerDay.toFixed(2)).toBe("12.35");
    expect(result.totalAmount.toFixed(2)).toBe("37.05");
    expect(result.depositAmount.toFixed(2)).toBe("100.01");
    expect(result.totalDue.toFixed(2)).toBe("137.06");
    expect(
      satisfiesBookingTotalAmountCheck({ ...result, totalDays: 3 }),
    ).toBe(true);
  });

  it("rejects a non-positive price and a negative deposit", () => {
    expect(() =>
      calculateBookingMoney({
        pricePerDay: new Prisma.Decimal("0"),
        totalDays: 1,
        depositAmount: new Prisma.Decimal("100"),
      }),
    ).toThrowError(/must be positive/);

    expect(() =>
      calculateBookingMoney({
        pricePerDay: new Prisma.Decimal("10"),
        totalDays: 1,
        depositAmount: new Prisma.Decimal("-0.01"),
      }),
    ).toThrowError(/must not be negative/);
  });
});
