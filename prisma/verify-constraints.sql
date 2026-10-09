\set ON_ERROR_STOP on

BEGIN;

INSERT INTO "User" (
  "id", "name", "email", "role", "status", "updatedAt"
) VALUES (
  'verify-user', 'Constraint Test User', 'verify-user@example.test',
  'CUSTOMER', 'ACTIVE', CURRENT_TIMESTAMP
);

INSERT INTO "Vehicle" (
  "id", "slug", "brand", "model", "year", "category", "seats",
  "transmission", "fuel", "drive", "depositAmount", "currency",
  "insuranceIncluded", "status", "location", "updatedAt"
) VALUES
  (
    'verify-vehicle-a', 'verify-vehicle-a', 'Verify', 'A', 2026, 'TEST', 5,
    'AUTOMATIC', 'PETROL', 'FWD', 100.00, 'GEL', true, 'AVAILABLE',
    'Tbilisi', CURRENT_TIMESTAMP
  ),
  (
    'verify-vehicle-b', 'verify-vehicle-b', 'Verify', 'B', 2026, 'TEST', 5,
    'AUTOMATIC', 'PETROL', 'FWD', 100.00, 'GEL', true, 'AVAILABLE',
    'Tbilisi', CURRENT_TIMESTAMP
  );

-- Baseline active booking: [10 Jan, 20 Jan).
INSERT INTO "Booking" (
  "id", "userId", "vehicleId", "startDate", "endDate",
  "pickupLocation", "returnLocation", "totalDays", "pricePerDay",
  "totalAmount", "depositAmount", "currency", "status", "paymentStatus",
  "updatedAt"
) VALUES (
  'verify-booking-active', 'verify-user', 'verify-vehicle-a',
  '2099-01-10 10:00:00+00', '2099-01-20 10:00:00+00',
  'Tbilisi', 'Tbilisi', 10, 100.00, 1000.00, 100.00, 'GEL',
  'PENDING', 'UNPAID', CURRENT_TIMESTAMP
);

-- Overlapping CONFIRMED against PENDING on the same vehicle -> 23P01.
DO $$
BEGIN
  BEGIN
    INSERT INTO "Booking" (
      "id", "userId", "vehicleId", "startDate", "endDate",
      "pickupLocation", "returnLocation", "totalDays", "pricePerDay",
      "totalAmount", "depositAmount", "currency", "status", "paymentStatus",
      "updatedAt"
    ) VALUES (
      'verify-booking-overlap', 'verify-user', 'verify-vehicle-a',
      '2099-01-15 10:00:00+00', '2099-01-18 10:00:00+00',
      'Tbilisi', 'Tbilisi', 3, 100.00, 300.00, 100.00, 'GEL',
      'CONFIRMED', 'UNPAID', CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'expected exclusion_violation for overlapping active bookings';
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE NOTICE 'overlapping PENDING/CONFIRMED: SQLSTATE=%', SQLSTATE;
  END;
END $$;

-- Adjacent interval succeeds because active booking ranges are [start, end).
INSERT INTO "Booking" (
  "id", "userId", "vehicleId", "startDate", "endDate",
  "pickupLocation", "returnLocation", "totalDays", "pricePerDay",
  "totalAmount", "depositAmount", "currency", "status", "paymentStatus",
  "updatedAt"
) VALUES (
  'verify-booking-adjacent', 'verify-user', 'verify-vehicle-a',
  '2099-01-20 10:00:00+00', '2099-01-22 10:00:00+00',
  'Tbilisi', 'Tbilisi', 2, 100.00, 200.00, 100.00, 'GEL',
  'CONFIRMED', 'UNPAID', CURRENT_TIMESTAMP
);

-- The same dates on another vehicle succeed.
INSERT INTO "Booking" (
  "id", "userId", "vehicleId", "startDate", "endDate",
  "pickupLocation", "returnLocation", "totalDays", "pricePerDay",
  "totalAmount", "depositAmount", "currency", "status", "paymentStatus",
  "updatedAt"
) VALUES (
  'verify-booking-other-vehicle', 'verify-user', 'verify-vehicle-b',
  '2099-01-10 10:00:00+00', '2099-01-20 10:00:00+00',
  'Tbilisi', 'Tbilisi', 10, 100.00, 1000.00, 100.00, 'GEL',
  'PENDING', 'UNPAID', CURRENT_TIMESTAMP
);

-- CANCELLED may overlap an active booking and is retained for the UPDATE test.
INSERT INTO "Booking" (
  "id", "userId", "vehicleId", "startDate", "endDate",
  "pickupLocation", "returnLocation", "totalDays", "pricePerDay",
  "totalAmount", "depositAmount", "currency", "status", "paymentStatus",
  "updatedAt"
) VALUES (
  'verify-booking-cancelled', 'verify-user', 'verify-vehicle-a',
  '2099-01-15 10:00:00+00', '2099-01-18 10:00:00+00',
  'Tbilisi', 'Tbilisi', 3, 100.00, 300.00, 100.00, 'GEL',
  'CANCELLED', 'UNPAID', CURRENT_TIMESTAMP
);

-- Promoting the overlapping CANCELLED booking to PENDING -> 23P01.
DO $$
BEGIN
  BEGIN
    UPDATE "Booking"
    SET "status" = 'PENDING', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 'verify-booking-cancelled';
    RAISE EXCEPTION 'expected exclusion_violation when activating overlap';
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE NOTICE 'UPDATE CANCELLED -> PENDING on occupied period: SQLSTATE=%', SQLSTATE;
  END;
END $$;

-- startDate >= endDate -> 23514.
DO $$
BEGIN
  BEGIN
    INSERT INTO "Booking" (
      "id", "userId", "vehicleId", "startDate", "endDate",
      "pickupLocation", "returnLocation", "totalDays", "pricePerDay",
      "totalAmount", "depositAmount", "currency", "status", "paymentStatus",
      "updatedAt"
    ) VALUES (
      'verify-booking-invalid-period', 'verify-user', 'verify-vehicle-b',
      '2099-02-02 10:00:00+00', '2099-02-01 10:00:00+00',
      'Tbilisi', 'Tbilisi', 1, 100.00, 100.00, 100.00, 'GEL',
      'CANCELLED', 'UNPAID', CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'expected check_violation for invalid booking period';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'booking startDate >= endDate: SQLSTATE=%', SQLSTATE;
  END;
END $$;

INSERT INTO "PricingRule" (
  "id", "vehicleId", "minDays", "maxDays", "pricePerDay", "currency"
) VALUES (
  'verify-price-base', 'verify-vehicle-a', 1, 2, 100.00, 'GEL'
);

-- Overlapping pricing range -> 23P01.
DO $$
BEGIN
  BEGIN
    INSERT INTO "PricingRule" (
      "id", "vehicleId", "minDays", "maxDays", "pricePerDay", "currency"
    ) VALUES (
      'verify-price-overlap', 'verify-vehicle-a', 2, 4, 90.00, 'GEL'
    );
    RAISE EXCEPTION 'expected exclusion_violation for overlapping pricing tiers';
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE NOTICE 'overlapping pricing tiers: SQLSTATE=%', SQLSTATE;
  END;
END $$;

-- Duplicate (vehicleId, minDays) -> 23505.
DO $$
BEGIN
  BEGIN
    INSERT INTO "PricingRule" (
      "id", "vehicleId", "minDays", "maxDays", "pricePerDay", "currency"
    ) VALUES (
      'verify-price-duplicate-min', 'verify-vehicle-a', 1, 1, 95.00, 'GEL'
    );
    RAISE EXCEPTION 'expected unique_violation for duplicate pricing minDays';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'duplicate pricing minDays: SQLSTATE=%', SQLSTATE;
  END;
END $$;

-- Uppercase email -> 23514.
DO $$
BEGIN
  BEGIN
    INSERT INTO "User" (
      "id", "name", "email", "role", "status", "updatedAt"
    ) VALUES (
      'verify-user-uppercase', 'Uppercase Email', 'Uppercase@example.test',
      'CUSTOMER', 'ACTIVE', CURRENT_TIMESTAMP
    );
    RAISE EXCEPTION 'expected check_violation for uppercase email';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'uppercase email: SQLSTATE=%', SQLSTATE;
  END;
END $$;

ROLLBACK;
