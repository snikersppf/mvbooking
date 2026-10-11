import { ConfigurationError } from "@/server/config/auth";

export function requireAppOrigin(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = env.APP_ORIGIN?.trim();

  if (!value) {
    throw new ConfigurationError("APP_ORIGIN must be configured.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigurationError("APP_ORIGIN must be a valid URL origin.");
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new ConfigurationError(
      "APP_ORIGIN must contain only an http(s) scheme, host, and optional port.",
    );
  }

  return url.origin;
}
