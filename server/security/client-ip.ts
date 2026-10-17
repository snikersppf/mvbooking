import { isIP } from "node:net";
import { RateLimitUnavailableError } from "@/server/security/rate-limit/rate-limiter";

type ClientIpInput = {
  connectionAddress: string | null;
  headers: Headers;
  trustProxy: boolean;
};

function normalizeIp(value: string | null): string | null {
  if (!value) return null;

  const candidate = value.trim();
  const unwrapped =
    candidate.startsWith("[") && candidate.endsWith("]")
      ? candidate.slice(1, -1)
      : candidate;
  const normalized = unwrapped.startsWith("::ffff:")
    ? unwrapped.slice(7)
    : unwrapped;

  return isIP(normalized) === 0 ? null : normalized;
}

export function resolveClientIp(input: ClientIpInput): string | null {
  if (input.trustProxy) {
    const forwardedFor = input.headers
      .get("x-forwarded-for")
      ?.split(",", 1)[0]
      ?.trim();
    const forwardedIp = normalizeIp(forwardedFor ?? null);
    if (forwardedIp) return forwardedIp;

    const realIp = normalizeIp(input.headers.get("x-real-ip"));
    if (realIp) return realIp;
  }

  return normalizeIp(input.connectionAddress);
}

export function requireRateLimitClientIp(
  clientIp: string | null,
  env: Readonly<{ NODE_ENV?: string }> = process.env,
): string {
  if (clientIp) return clientIp;
  if (env.NODE_ENV === "production") throw new RateLimitUnavailableError();
  return "unavailable";
}
