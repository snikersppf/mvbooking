import { trustProxyHeaders } from "@/server/config/auth";
import { requireRateLimitClientIp, resolveClientIp } from "@/server/security/client-ip";
import { createDefaultRateLimitStore } from "@/server/security/rate-limit/factory";
import { RateLimiter } from "@/server/security/rate-limit/rate-limiter";

export const API_RATE_LIMITS = Object.freeze({
  publicRead: { limit: 120, windowMs: 60_000 },
  bookingCreate: { limit: 10, windowMs: 60_000 },
  adminMutation: { limit: 60, windowMs: 60_000 },
});

let publicReadRateLimiter: RateLimiter | undefined;
let bookingCreateRateLimiter: RateLimiter | undefined;
let adminMutationRateLimiter: RateLimiter | undefined;

function getPublicReadRateLimiter(): RateLimiter {
  publicReadRateLimiter ??= new RateLimiter(createDefaultRateLimitStore());
  return publicReadRateLimiter;
}

function getBookingCreateRateLimiter(): RateLimiter {
  bookingCreateRateLimiter ??= new RateLimiter(createDefaultRateLimitStore());
  return bookingCreateRateLimiter;
}

function getAdminMutationRateLimiter(): RateLimiter {
  adminMutationRateLimiter ??= new RateLimiter(createDefaultRateLimitStore());
  return adminMutationRateLimiter;
}

export async function enforcePublicReadRateLimit(
  request: Request,
): Promise<void> {
  const clientIp = resolveClientIp({
    connectionAddress: null,
    headers: request.headers,
    trustProxy: trustProxyHeaders(),
  });
  await getPublicReadRateLimiter().check({
    key: `public-read:ip:${requireRateLimitClientIp(clientIp)}`,
    ...API_RATE_LIMITS.publicRead,
  });
}

export async function enforceBookingCreateRateLimit(
  userId: string,
): Promise<void> {
  await getBookingCreateRateLimiter().check({
    key: `booking-create:user:${userId}`,
    ...API_RATE_LIMITS.bookingCreate,
  });
}

export async function enforceAdminMutationRateLimit(
  userId: string,
): Promise<void> {
  await getAdminMutationRateLimiter().check({
    key: `admin-mutation:user:${userId}`,
    ...API_RATE_LIMITS.adminMutation,
  });
}
