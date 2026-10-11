import { BookingServiceError } from "@/server/services/booking/service-errors";

const BOOKING_OVERLAP_CONSTRAINT = "booking_no_active_overlap";
const BOOKING_IDEMPOTENCY_CONSTRAINT =
  "Booking_userId_idempotencyKey_key";

type UnknownRecord = Record<string, unknown>;

export type PrismaDatabaseErrorInfo = Readonly<{
  prismaCode: string | null;
  sqlState: string | null;
  constraintName: string | null;
  databaseMessage: string | null;
}>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function stringProperty(
  object: UnknownRecord | null,
  property: string,
): string | null {
  const value = object?.[property];
  return typeof value === "string" ? value : null;
}

function constraintFromValue(value: unknown): string | null {
  const constraint = asRecord(value);
  return stringProperty(constraint, "index");
}

function constraintFromMessage(message: string | null): string | null {
  return message?.match(/constraint ["`]([^"`]+)["`]/i)?.[1] ?? null;
}

export function inspectPrismaDatabaseError(
  error: unknown,
): PrismaDatabaseErrorInfo {
  const errorRecord = asRecord(error);
  const meta = asRecord(errorRecord?.meta);
  const driverAdapterError = asRecord(meta?.driverAdapterError);
  const cause = asRecord(driverAdapterError?.cause);
  const prismaCode = stringProperty(errorRecord, "code");
  const originalCode = stringProperty(cause, "originalCode");
  const nativeCode = stringProperty(cause, "code");
  const sqlState = originalCode ?? nativeCode;
  const originalMessage = stringProperty(cause, "originalMessage");
  const causeMessage = stringProperty(cause, "message");
  const errorMessage = stringProperty(errorRecord, "message");
  const databaseMessage = originalMessage ?? causeMessage ?? errorMessage;
  const constraintName =
    constraintFromValue(cause?.constraint) ??
    constraintFromMessage(databaseMessage);

  return {
    prismaCode,
    sqlState,
    constraintName,
    databaseMessage,
  };
}

export function isRetryableBookingTransactionError(error: unknown): boolean {
  const info = inspectPrismaDatabaseError(error);
  return (
    info.prismaCode === "P2034" ||
    info.sqlState === "40001" ||
    info.sqlState === "40P01"
  );
}

export function isBookingOverlapPersistenceError(error: unknown): boolean {
  const info = inspectPrismaDatabaseError(error);
  return (
    info.sqlState === "23P01" &&
    info.constraintName === BOOKING_OVERLAP_CONSTRAINT
  );
}

export function isBookingIdempotencyUniqueError(error: unknown): boolean {
  const info = inspectPrismaDatabaseError(error);
  return (
    info.prismaCode === "P2002" &&
    info.constraintName === BOOKING_IDEMPOTENCY_CONSTRAINT
  );
}

export function mapBookingPersistenceError(
  error: unknown,
  requestId: string,
): unknown {
  if (isBookingOverlapPersistenceError(error)) {
    return new BookingServiceError(
      "VEHICLE_UNAVAILABLE",
      409,
      "Vehicle is unavailable for the requested interval.",
      requestId,
    );
  }

  return error;
}
