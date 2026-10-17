export type AdminServiceErrorCode =
  | "ADMIN_RESOURCE_NOT_FOUND"
  | "VEHICLE_NOT_FOUND"
  | "VEHICLE_SLUG_CONFLICT"
  | "VEHICLE_HAS_FUTURE_BOOKINGS"
  | "USER_NOT_FOUND"
  | "LAST_ACTIVE_ADMIN"
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "IDEMPOTENCY_KEY_INVALID"
  | "IDEMPOTENCY_KEY_REUSED";

export class AdminServiceError extends Error {
  constructor(
    readonly code: AdminServiceErrorCode,
    readonly status: number,
    message: string,
    readonly requestId: string,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}
