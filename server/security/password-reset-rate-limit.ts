import { trustProxyHeaders } from "@/server/config/auth";
import { requireRateLimitClientIp, resolveClientIp } from "@/server/security/client-ip";
import { createDefaultRateLimitStore } from "@/server/security/rate-limit/factory";
import { RateLimiter } from "@/server/security/rate-limit/rate-limiter";

let limiter: RateLimiter | undefined;

export async function enforcePasswordResetRateLimit(
  request: Request,
  action: "request" | "confirm",
): Promise<void> {
  limiter ??= new RateLimiter(createDefaultRateLimitStore());
  const ip = resolveClientIp({
    headers: request.headers,
    connectionAddress: null,
    trustProxy: trustProxyHeaders(),
  });
  await limiter.check({
    key: `password-reset:${action}:ip:${requireRateLimitClientIp(ip)}`,
    limit: action === "request" ? 5 : 10,
    windowMs: 60 * 60 * 1_000,
  });
}
