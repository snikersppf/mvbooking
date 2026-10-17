import { trustProxyHeaders } from "@/server/config/auth";
import { requireAppOrigin } from "@/server/config/http";
import { logRouteHandlerError } from "@/server/http/route-handler-errors";
import { requireRateLimitClientIp, resolveClientIp } from "@/server/security/client-ip";
import {
  assertTrustedMutationRequest,
  MutationRequestError,
} from "@/server/security/mutation-request";
import { createDefaultRateLimitStore } from "@/server/security/rate-limit/factory";
import {
  RateLimiter,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/server/security/rate-limit/rate-limiter";
import {
  registerUser,
  RegistrationConflictError,
  RegistrationValidationError,
} from "@/server/services/users/register-user";

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

let registrationRateLimiter: RateLimiter | undefined;

function getRegistrationRateLimiter(): RateLimiter {
  registrationRateLimiter ??= new RateLimiter(
    createDefaultRateLimitStore(),
  );
  return registrationRateLimiter;
}

function jsonError(
  status: number,
  code: string,
  messageKey: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json(
    { error: { code, messageKey, ...extra } },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    assertTrustedMutationRequest(request, requireAppOrigin());

    // Next.js 16 does not expose the socket IP. Production requires a trusted
    // ingress that replaces forwarded headers before they reach this handler.
    const clientIp = resolveClientIp({
      connectionAddress: null,
      headers: request.headers,
      trustProxy: trustProxyHeaders(),
    });

    await getRegistrationRateLimiter().check({
      key: `register:ip:${requireRateLimitClientIp(clientIp)}`,
      limit: REGISTER_LIMIT,
      windowMs: REGISTER_WINDOW_MS,
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "errors.invalidJson");
    }

    const user = await registerUser(body);
    return Response.json(
      { data: user },
      {
        status: 201,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    if (error instanceof MutationRequestError) {
      return jsonError(error.status, error.code, error.messageKey);
    }

    if (error instanceof RegistrationValidationError) {
      return jsonError(400, error.code, "errors.validation", {
        fieldErrors: error.details.flatten().fieldErrors,
      });
    }

    if (error instanceof RegistrationConflictError) {
      return jsonError(409, error.code, "errors.emailAlreadyRegistered");
    }

    if (error instanceof RateLimitExceededError) {
      const retryAfter = Math.max(1, Math.ceil(error.retryAfterMs / 1000));
      const response = jsonError(429, error.code, "errors.rateLimitExceeded");
      response.headers.set("Retry-After", String(retryAfter));
      return response;
    }

    if (error instanceof RateLimitUnavailableError) {
      return jsonError(503, error.code, "errors.serviceUnavailable");
    }
    logRouteHandlerError("POST /api/auth/register", error);
    return jsonError(
      503,
      "REGISTRATION_UNAVAILABLE",
      "errors.serviceUnavailable",
    );
  }
}
