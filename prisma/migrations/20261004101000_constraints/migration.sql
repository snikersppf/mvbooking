-- Constraints Prisma Schema Language cannot express. Apply after the init migration.
-- The database user must be able to install the trusted btree_gist extension.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "User"
  ADD CONSTRAINT "user_session_version_nonnegative"
  CHECK ("sessionVersion" >= 0);

ALTER TABLE "Vehicle"
  ADD CONSTRAINT "vehicle_deposit_nonnegative"
  CHECK ("depositAmount" >= 0),
  ADD CONSTRAINT "vehicle_seats_positive"
  CHECK ("seats" > 0),
  ADD CONSTRAINT "vehicle_currency_gel"
  CHECK ("currency" = 'GEL');

ALTER TABLE "PricingRule"
  ADD CONSTRAINT "pricing_day_range_valid"
  CHECK (
    "minDays" >= 1 AND "minDays" <= 365
    AND ("maxDays" IS NULL OR
      ("maxDays" >= "minDays" AND "maxDays" <= 365))
  ),
  ADD CONSTRAINT "pricing_price_positive"
  CHECK ("pricePerDay" > 0),
  ADD CONSTRAINT "pricing_currency_gel"
  CHECK ("currency" = 'GEL');

-- Integer ranges use inclusive day bounds. NULL maxDays means no upper bound.
ALTER TABLE "PricingRule"
  ADD CONSTRAINT "pricing_no_overlapping_tiers"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    int4range("minDays", "maxDays", '[]') WITH &&
  );

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_valid_period"
  CHECK ("startDate" < "endDate"),
  ADD CONSTRAINT "booking_total_days_positive"
  CHECK ("totalDays" >= 1),
  ADD CONSTRAINT "booking_price_positive"
  CHECK ("pricePerDay" > 0),
  ADD CONSTRAINT "booking_total_amount_valid"
  CHECK ("totalAmount" = "pricePerDay" * "totalDays"),
  ADD CONSTRAINT "booking_deposit_nonnegative"
  CHECK ("depositAmount" >= 0),
  ADD CONSTRAINT "booking_currency_gel"
  CHECK ("currency" = 'GEL'),
  ADD CONSTRAINT "booking_idempotency_pair"
  CHECK (
    ("idempotencyKey" IS NULL AND "requestHash" IS NULL)
    OR
    ("idempotencyKey" IS NOT NULL AND "requestHash" IS NOT NULL
      AND length("idempotencyKey") BETWEEN 1 AND 128
      AND length("requestHash") = 64)
  );

-- [startDate, endDate) lets the next booking start exactly at return time.
-- Only PENDING and CONFIRMED occupy the vehicle.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_active_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startDate", "endDate", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "Payment"
  ADD CONSTRAINT "payment_amount_positive"
  CHECK ("amount" > 0),
  ADD CONSTRAINT "payment_currency_gel"
  CHECK ("currency" = 'GEL');

ALTER TABLE "Notification"
  ADD CONSTRAINT "notification_attempts_nonnegative"
  CHECK ("attempts" >= 0);
