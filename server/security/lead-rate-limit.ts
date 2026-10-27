import { trustProxyHeaders } from "@/server/config/auth";
import { requireRateLimitClientIp, resolveClientIp } from "@/server/security/client-ip";
import { PostgresRateLimitStore } from "@/server/security/rate-limit/postgres-store";
import { RateLimiter } from "@/server/security/rate-limit/rate-limiter";

const limiter = new RateLimiter(new PostgresRateLimitStore());
export async function enforceLeadRateLimit(request: Request): Promise<void> {
  const ip = resolveClientIp({ headers: request.headers, connectionAddress: null, trustProxy: trustProxyHeaders() });
  await limiter.check({ key: `lead:ip:${requireRateLimitClientIp(ip)}`, limit: 5, windowMs: 60 * 60 * 1000 });
}
