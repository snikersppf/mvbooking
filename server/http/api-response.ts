import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import {
  AuthenticationRequiredError,
  AuthInfrastructureError,
  ForbiddenError,
} from "@/server/auth/errors";
import { ConfigurationError } from "@/server/config/auth";
import { logRouteHandlerError } from "@/server/http/route-handler-errors";
import { MutationRequestError } from "@/server/security/mutation-request";
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/server/security/rate-limit/rate-limiter";
import { BookingRuleError } from "@/server/services/booking/errors";
import { BookingServiceError } from "@/server/services/booking/service-errors";

export const PRIVATE_NO_STORE = "private, no-store";
export const PUBLIC_CATALOG_CACHE =
  "public, max-age=30, stale-while-revalidate=60";
export const PUBLIC_NO_STORE = "no-store";

export type ApiFieldErrors = Record<string, string[] | undefined>;

export type ApiErrorDescriptor = Readonly<{
  status: number;
  code: string;
  messageKey: string;
  fieldErrors?: ApiFieldErrors;
  retryAfterSeconds?: number;
}>;

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly messageKey: string,
  ) {
    super(code);
    this.name = "ApiRequestError";
  }
}

export class ApiNotFoundError extends ApiRequestError {
  constructor(code: string, messageKey: string) {
    super(404, code, messageKey);
    this.name = "ApiNotFoundError";
  }
}

const bookingMessageKeys: Readonly<Record<string, string>> = {
  VEHICLE_NOT_FOUND: "errors.vehicleNotFound",
  VEHICLE_UNAVAILABLE: "errors.vehicleUnavailable",
  PENDING_BOOKING_LIMIT_REACHED: "errors.pendingBookingLimitReached",
  IDEMPOTENCY_KEY_INVALID: "errors.idempotencyKeyInvalid",
  IDEMPOTENCY_KEY_REUSED: "errors.idempotencyKeyReused",
  BOOKING_NOT_FOUND: "errors.bookingNotFound",
  BOOKING_CANNOT_BE_CANCELLED: "errors.bookingCannotBeCancelled",
  BOOKING_TEMPORARILY_UNAVAILABLE: "errors.serviceUnavailable",
  USER_NOT_FOUND: "errors.authenticationRequired",
  USER_NOT_ACTIVE: "errors.authenticationRequired",
  SESSION_VERSION_MISMATCH: "errors.authenticationRequired",
  BOOKING_CONFIGURATION_ERROR: "errors.serviceUnavailable",
};

function describeBookingServiceError(
  error: BookingServiceError,
): ApiErrorDescriptor {
  if (error.code === "BOOKING_FORBIDDEN") {
    return {
      status: 404,
      code: "BOOKING_NOT_FOUND",
      messageKey: "errors.bookingNotFound",
    };
  }

  const authenticationFailure =
    error.code === "USER_NOT_FOUND" ||
    error.code === "USER_NOT_ACTIVE" ||
    error.code === "SESSION_VERSION_MISMATCH";

  return {
    status: authenticationFailure ? 401 : error.status,
    code: authenticationFailure ? "AUTHENTICATION_REQUIRED" : error.code,
    messageKey:
      bookingMessageKeys[error.code] ??
      (error.status >= 500 ? "errors.serviceUnavailable" : "errors.request"),
  };
}

function describeBookingRuleError(error: BookingRuleError): ApiErrorDescriptor {
  if (error.code === "VEHICLE_UNAVAILABLE") {
    return {
      status: 409,
      code: error.code,
      messageKey: "errors.vehicleUnavailable",
    };
  }

  if (
    error.code === "INVALID_BOOKING_PERIOD" ||
    error.code === "BOOKING_START_IN_PAST" ||
    error.code === "BOOKING_DURATION_EXCEEDED"
  ) {
    return {
      status: 400,
      code: error.code,
      messageKey: "errors.validation",
    };
  }

  return {
    status: 503,
    code: "CATALOG_UNAVAILABLE",
    messageKey: "errors.serviceUnavailable",
  };
}

export function describeApiError(error: unknown): ApiErrorDescriptor | null {
  if (error instanceof ZodError) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      messageKey: "errors.validation",
      fieldErrors: error.flatten().fieldErrors,
    };
  }
  if (error instanceof ApiRequestError) {
    return {
      status: error.status,
      code: error.code,
      messageKey: error.messageKey,
    };
  }
  if (error instanceof AuthenticationRequiredError) {
    return {
      status: 401,
      code: error.code,
      messageKey: "errors.authenticationRequired",
    };
  }
  if (error instanceof ForbiddenError) {
    return {
      status: 403,
      code: error.code,
      messageKey: "errors.forbidden",
    };
  }
  if (error instanceof AuthInfrastructureError) {
    return {
      status: 503,
      code: error.code,
      messageKey: "errors.serviceUnavailable",
    };
  }
  if (error instanceof MutationRequestError) {
    return {
      status: error.status,
      code: error.code,
      messageKey: error.messageKey,
    };
  }
  if (error instanceof RateLimitExceededError) {
    return {
      status: error.status,
      code: error.code,
      messageKey: "errors.rateLimitExceeded",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(error.retryAfterMs / 1_000),
      ),
    };
  }
  if (
    error instanceof RateLimitUnavailableError ||
    error instanceof ConfigurationError
  ) {
    return {
      status: 503,
      code: error.code,
      messageKey: "errors.serviceUnavailable",
    };
  }
  if (error instanceof BookingServiceError) {
    return describeBookingServiceError(error);
  }
  if (error instanceof BookingRuleError) {
    return describeBookingRuleError(error);
  }
  return null;
}

type JsonDataOptions = Readonly<{
  status?: number;
  cacheControl: string;
  requestId: string;
}>;

export function jsonData<T>(data: T, options: JsonDataOptions): Response {
  return Response.json(
    { data },
    {
      status: options.status ?? 200,
      headers: {
        "Cache-Control": options.cacheControl,
        "X-Request-Id": options.requestId,
      },
    },
  );
}

export function jsonApiError(
  descriptor: ApiErrorDescriptor,
  requestId: string,
): Response {
  const response = Response.json(
    {
      error: {
        code: descriptor.code,
        messageKey: descriptor.messageKey,
        ...(descriptor.fieldErrors
          ? { fieldErrors: descriptor.fieldErrors }
          : {}),
        requestId,
      },
    },
    {
      status: descriptor.status,
      headers: {
        "Cache-Control": PRIVATE_NO_STORE,
        "X-Request-Id": requestId,
      },
    },
  );

  if (descriptor.retryAfterSeconds !== undefined) {
    response.headers.set(
      "Retry-After",
      String(descriptor.retryAfterSeconds),
    );
  }
  return response;
}

export function apiErrorResponse(
  route: string,
  error: unknown,
  requestId: string,
): Response {
  const descriptor = describeApiError(error);
  if (descriptor) return jsonApiError(descriptor, requestId);

  logRouteHandlerError(route, error);
  return jsonApiError(
    {
      status: 500,
      code: "INTERNAL_ERROR",
      messageKey: "errors.internal",
    },
    requestId,
  );
}

type ApiHandler<TArguments extends unknown[]> = (
  requestId: string,
  ...arguments_: TArguments
) => Response | Promise<Response>;

export function withApiHandler<TArguments extends unknown[]>(
  route: string,
  handler: ApiHandler<TArguments>,
): (...arguments_: TArguments) => Promise<Response> {
  return async (...arguments_: TArguments): Promise<Response> => {
    const requestId = randomUUID();
    try {
      return await handler(requestId, ...arguments_);
    } catch (error) {
      return apiErrorResponse(route, error, requestId);
    }
  };
}
