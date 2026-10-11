import type { Prisma } from "@prisma/client";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { BookingRuleError } from "@/server/services/booking/errors";

export type PricingTier = Readonly<{
  minDays: number;
  maxDays: number | null;
  pricePerDay: Prisma.Decimal;
}>;

function assertValidPricingTier(tier: PricingTier): void {
  if (
    !Number.isInteger(tier.minDays) ||
    tier.minDays < 1 ||
    tier.minDays > BOOKING_CONFIG.maxDurationDays ||
    (tier.maxDays !== null &&
      (!Number.isInteger(tier.maxDays) ||
        tier.maxDays < tier.minDays ||
        tier.maxDays > BOOKING_CONFIG.maxDurationDays))
  ) {
    throw new BookingRuleError(
      "INVALID_PRICING_TIER",
      "Pricing tier day bounds are invalid.",
    );
  }
}

export function selectPricingTier<TTier extends PricingTier>(
  totalDays: number,
  tiers: readonly TTier[],
): TTier {
  if (!Number.isInteger(totalDays) || totalDays < 1) {
    throw new BookingRuleError(
      "INVALID_PRICING_TIER",
      "Pricing requires a positive whole number of days.",
    );
  }

  for (const tier of tiers) assertValidPricingTier(tier);

  const matches = tiers.filter(
    (tier) =>
      totalDays >= tier.minDays &&
      (tier.maxDays === null || totalDays <= tier.maxDays),
  );

  if (matches.length === 0) {
    throw new BookingRuleError(
      "PRICING_TIER_NOT_FOUND",
      "No pricing tier covers the booking duration.",
    );
  }

  if (matches.length > 1) {
    throw new BookingRuleError(
      "AMBIGUOUS_PRICING_TIER",
      "More than one pricing tier covers the booking duration.",
    );
  }

  return matches[0];
}
