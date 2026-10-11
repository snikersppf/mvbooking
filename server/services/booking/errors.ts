export type BookingRuleErrorCode =
  | "INVALID_BOOKING_PERIOD"
  | "BOOKING_START_IN_PAST"
  | "BOOKING_DURATION_EXCEEDED"
  | "INVALID_PRICING_TIER"
  | "PRICING_TIER_NOT_FOUND"
  | "AMBIGUOUS_PRICING_TIER"
  | "INVALID_BOOKING_AMOUNT"
  | "VEHICLE_UNAVAILABLE";

export class BookingRuleError extends Error {
  constructor(
    readonly code: BookingRuleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BookingRuleError";
  }
}
