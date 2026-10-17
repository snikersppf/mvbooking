import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

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

export type AdminFieldErrors = Readonly<Record<string, string[] | undefined>>;

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
    readonly retryAfterSeconds: number | null,
    readonly fieldErrors: AdminFieldErrors | null,
  ) {
    super(code);
    this.name = "AdminApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFieldErrors(value: unknown): value is AdminFieldErrors {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (messages) =>
        messages === undefined ||
        (Array.isArray(messages) &&
          messages.every((message) => typeof message === "string")),
    )
  );
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readAdminData<T>(response: Response): Promise<T> {
  const body = await readResponseBody(response);
  if (!response.ok) {
    const envelope: ApiErrorEnvelope = isRecord(body) ? body : {};
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new AdminApiError(
      response.status,
      typeof envelope.error?.code === "string"
        ? envelope.error.code
        : "REQUEST_FAILED",
      typeof envelope.error?.requestId === "string"
        ? envelope.error.requestId
        : null,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
      isFieldErrors(envelope.error?.fieldErrors)
        ? envelope.error.fieldErrors
        : null,
    );
  }
  if (!isRecord(body) || !("data" in body)) {
    throw new AdminApiError(
      502,
      "INVALID_API_RESPONSE",
      null,
      null,
      null,
    );
  }
  return body.data as T;
}

export type AdminMutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type AdminMutationRequest = Readonly<{
  path: string;
  method: AdminMutationMethod;
  body?: unknown;
  idempotencyKey: string;
}>;

export function createAdminIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export async function requestAdminMutation<T>(
  request: AdminMutationRequest,
  fetcher: Fetcher = fetch,
): Promise<T> {
  const response = await fetcher(request.path, {
    method: request.method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": request.idempotencyKey,
    },
    body: JSON.stringify(request.body ?? {}),
  });
  return readAdminData<T>(response);
}

export function describeAdminMutationFailure(error: unknown): string {
  if (!(error instanceof AdminApiError)) {
    return "The service could not be reached. Try again.";
  }
  if (error.status === 401) return "Your session expired. Sign in again.";
  if (error.status === 403) return "You do not have permission for this action.";
  if (error.status === 429) {
    return error.retryAfterSeconds
      ? `Too many requests. Try again in ${error.retryAfterSeconds} seconds.`
      : "Too many requests. Wait a moment and try again.";
  }

  const conflicts: Readonly<Record<string, string>> = {
    VEHICLE_SLUG_CONFLICT: "A vehicle with this slug already exists.",
    VEHICLE_HAS_FUTURE_BOOKINGS:
      "This vehicle has future active bookings and cannot be archived.",
    LAST_ACTIVE_ADMIN: "The final active administrator cannot be changed.",
    INVALID_BOOKING_TRANSITION:
      "The booking status changed. Reload and choose an available transition.",
  };
  if (error.code in conflicts) return conflicts[error.code];
  if (error.status === 400) return "Check the entered information.";
  if (error.status === 404) return "The requested item was not found.";
  if (error.status === 409) return "The change conflicts with current data.";
  return "The service is temporarily unavailable. Try again.";
}

export function applyAdminFieldErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
): boolean {
  if (!(error instanceof AdminApiError) || !error.fieldErrors) return false;
  let applied = false;
  for (const [path, messages] of Object.entries(error.fieldErrors)) {
    if (!messages?.length) continue;
    if (path !== "root") {
      setError(path as Path<TValues>, {
        type: "server",
        message: messages.join(" "),
      });
    }
    applied = true;
  }
  return applied;
}


