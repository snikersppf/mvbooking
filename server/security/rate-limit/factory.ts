import { ConfigurationError } from "@/server/config/auth";
import { MemoryRateLimitStore } from "./memory-store";
import type { RateLimitStore } from "./types";

const PRODUCTION_BUILD_PHASE = "phase-production-build";

export function createDefaultRateLimitStore(
  env: Partial<Record<"NODE_ENV" | "NEXT_PHASE", string>> =
    process.env,
): RateLimitStore {
  if (
    env.NODE_ENV === "production" &&
    env.NEXT_PHASE !== PRODUCTION_BUILD_PHASE
  ) {
    throw new ConfigurationError(
      "In-memory rate limiting is forbidden in production runtime.",
    );
  }

  return new MemoryRateLimitStore();
}
