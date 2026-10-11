const MIN_AUTH_SECRET_BYTES = 32;

export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function requireAuthSecret(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const secret = env.AUTH_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < MIN_AUTH_SECRET_BYTES) {
    throw new ConfigurationError(
      "AUTH_SECRET must contain at least 32 bytes.",
    );
  }

  return secret;
}

export function trustProxyHeaders(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  const value = env.TRUST_PROXY_HEADERS;

  if (!value) return false;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new ConfigurationError(
    "TRUST_PROXY_HEADERS must be either true or false.",
  );
}
