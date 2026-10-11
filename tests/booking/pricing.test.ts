import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  selectPricingTier,
  type PricingTier,
} from "@/server/services/booking/pricing";

const tiers: readonly PricingTier[] = [
  { minDays: 1, maxDays: 2, pricePerDay: new Prisma.Decimal("100.00") },
  { minDays: 3, maxDays: 6, pricePerDay: new Prisma.Decimal("90.00") },
  { minDays: 7, maxDays: 14, pricePerDay: new Prisma.Decimal("80.00") },
  { minDays: 15, maxDays: null, pricePerDay: new Prisma.Decimal("70.00") },
];

describe("selectPricingTier", () => {
  it.each([
    [2, "100.00"],
    [3, "90.00"],
    [6, "90.00"],
    [7, "80.00"],
    [14, "80.00"],
    [15, "70.00"],
    [365, "70.00"],
  ])("selects the inclusive tier boundary for %i days", (days, price) => {
    expect(selectPricingTier(days, tiers).pricePerDay.toFixed(2)).toBe(price);
  });

  it("throws when no tier covers the duration", () => {
    expect(() => selectPricingTier(3, [tiers[0]])).toThrowError(
      /No pricing tier covers/,
    );
  });

  it("rejects ambiguous overlapping tiers", () => {
    expect(() =>
      selectPricingTier(2, [
        tiers[0],
        { minDays: 2, maxDays: 3, pricePerDay: new Prisma.Decimal("95.00") },
      ]),
    ).toThrowError(/More than one pricing tier/);
  });

  it("rejects tier bounds beyond the maximum booking duration", () => {
    expect(() =>
      selectPricingTier(365, [
        {
          minDays: 1,
          maxDays: 366,
          pricePerDay: new Prisma.Decimal("100.00"),
        },
      ]),
    ).toThrowError(/day bounds are invalid/);
  });
});
