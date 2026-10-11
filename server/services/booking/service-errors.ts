export type BookingServiceErrorCode =
  | "USER_NOT_FOUND"
  | "USER_NOT_ACTIVE"
  | "SESSION_VERSION_MISMATCH"
  | "BOOKING_FORBIDDEN"
  | "VEHICLE_NOT_FOUND"
  | "VEHICLE_UNAVAILABLE"
  | "PENDING_BOOKING_LIMIT_REACHED"
  | "IDEMPOTENCY_KEY_INVALID"
  | "IDEMPOTENCY_KEY_REUSED"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_CANNOT_BE_CANCELLED"
  | "INVALID_BOOKING_TRANSITION"
  | "BOOKING_CONFIGURATION_ERROR"
  | "BOOKING_TEMPORARILY_UNAVAILABLE";

export class BookingServiceError extends Error {
  constructor(
    readonly code: BookingServiceErrorCode,
    readonly status: number,
    message: string,
    readonly requestId: string,
  ) {
    super(message);
    this.name = "BookingServiceError";
  }
}
