export const BOOKING_CONFIG = Object.freeze({
  gracePeriodMs: 0,
  availabilityBufferMs: 0,
  maxDurationDays: 365,
  maxActivePendingPerUser: 3,
  displayTimeZone: "Asia/Tbilisi",
});

export const PENDING_BOOKING_EXPIRATION_MS = 24 * 60 * 60 * 1_000;
