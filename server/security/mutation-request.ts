const UNSAFE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export class MutationRequestError extends Error {
  constructor(
    readonly status: 403 | 415,
    readonly code: "UNTRUSTED_ORIGIN" | "UNSUPPORTED_MEDIA_TYPE",
    readonly messageKey: string,
  ) {
    super(code);
    this.name = "MutationRequestError";
  }
}

function isExactOrigin(value: string, expectedOrigin: string): boolean {
  try {
    return new URL(value).origin === value && value === expectedOrigin;
  } catch {
    return false;
  }
}

export function assertTrustedMutationRequest(
  request: Request,
  expectedOrigin: string,
): void {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (
    !origin ||
    !isExactOrigin(origin, expectedOrigin) ||
    fetchSite === "cross-site"
  ) {
    throw new MutationRequestError(
      403,
      "UNTRUSTED_ORIGIN",
      "errors.untrustedOrigin",
    );
  }

  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (mediaType !== "application/json") {
    throw new MutationRequestError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "errors.unsupportedMediaType",
    );
  }
}
