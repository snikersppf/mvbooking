import type { CustomerBookingDto } from "@/server/services/booking/customer-booking-dto";
import type { VehicleAvailabilityResult } from "@/server/services/availability/check-vehicle";
import type {
  CreateBookingPayload,
  QuoteDateRange,
} from "@/components/booking/form-schema";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type ApiErrorEnvelope = Readonly<{
  error?: Readonly<{
    code?: unknown;
    fieldErrors?: unknown;
    requestId?: unknown;
  }>;
}>;

export class BookingApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
    readonly retryAfterSeconds: number | null,
  ) {
    super(code);
    this.name = "BookingApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readApiData<T>(response: Response): Promise<T> {
  const body = await readResponseBody(response);
  if (!response.ok) {
    const envelope: ApiErrorEnvelope = isRecord(body) ? body : {};
    const code =
      typeof envelope.error?.code === "string"
        ? envelope.error.code
        : "REQUEST_FAILED";
    const requestId =
      typeof envelope.error?.requestId === "string"
        ? envelope.error.requestId
        : null;
    const retryAfterValue = Number(response.headers.get("Retry-After"));

    throw new BookingApiError(
      response.status,
      code,
      requestId,
      Number.isFinite(retryAfterValue) && retryAfterValue > 0
        ? retryAfterValue
        : null,
    );
  }

  if (!isRecord(body) || !("data" in body)) {
    throw new BookingApiError(
      502,
      "INVALID_API_RESPONSE",
      null,
      null,
    );
  }

  return body.data as T;
}

export async function requestVehicleQuote(
  slug: string,
  dates: QuoteDateRange,
  fetcher: Fetcher = fetch,
): Promise<VehicleAvailabilityResult> {
  const searchParams = new URLSearchParams(dates);
  const response = await fetcher(
    "/api/vehicles/" +
      encodeURIComponent(slug) +
      "/quote?" +
      searchParams.toString(),
    {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    },
  );
  return readApiData<VehicleAvailabilityResult>(response);
}

export type CreateBookingResult = Readonly<{
  booking: CustomerBookingDto;
  replayed: boolean;
}>;

export async function submitBooking(
  payload: CreateBookingPayload,
  idempotencyKey: string,
  fetcher: Fetcher = fetch,
): Promise<CreateBookingResult> {
  const response = await fetcher("/api/bookings", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  return readApiData<CreateBookingResult>(response);
}

export async function cancelCustomerBooking(
  bookingId: string,
  fetcher: Fetcher = fetch,
): Promise<CustomerBookingDto> {
  const response = await fetcher(
    "/api/bookings/" + encodeURIComponent(bookingId) + "/cancel",
    {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
    },
  );
  const data = await readApiData<{ booking: CustomerBookingDto }>(response);
  return data.booking;
}

export type BookingApiAction = "quote" | "create" | "cancel";

export type BookingRequestFailure = Readonly<{
  message: string;
  requiresSignIn: boolean;
}>;

export function describeBookingRequestFailure(
  error: unknown,
  action: BookingApiAction,
): BookingRequestFailure {
  if (!(error instanceof BookingApiError)) {
    return {
      message: "The service could not be reached. Try again.",
      requiresSignIn: false,
    };
  }

  if (error.status === 401) {
    return {
      message: "Sign in to continue.",
      requiresSignIn: true,
    };
  }

  if (error.status === 429) {
    return {
      message: error.retryAfterSeconds
        ? "Too many requests. Try again in " +
          error.retryAfterSeconds +
          " seconds."
        : "Too many requests. Wait a moment and try again.",
      requiresSignIn: false,
    };
  }

  if (error.status === 409) {
    const messages: Readonly<Record<string, string>> = {
      VEHICLE_UNAVAILABLE:
        "This vehicle is no longer available for these dates. Check the price again.",
      PENDING_BOOKING_LIMIT_REACHED:
        "You already have the maximum number of pending bookings.",
      IDEMPOTENCY_KEY_REUSED:
        "This request changed after it was submitted. Try again.",
      BOOKING_CANNOT_BE_CANCELLED:
        "This booking can no longer be cancelled.",
    };
    return {
      message:
        messages[error.code] ??
        (action === "cancel"
          ? "The booking could not be cancelled."
          : "The booking conflicts with another request."),
      requiresSignIn: false,
    };
  }

  if (error.status === 400) {
    return {
      message: "Check the entered information and try again.",
      requiresSignIn: false,
    };
  }

  if (error.status === 404 && action === "cancel") {
    return {
      message: "The booking was not found.",
      requiresSignIn: false,
    };
  }

  return {
    message: "The service is temporarily unavailable. Try again.",
    requiresSignIn: false,
  };
}
