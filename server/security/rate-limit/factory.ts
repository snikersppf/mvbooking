import { MemoryRateLimitStore } from "./memory-store";
import { PostgresRateLimitStore } from "./postgres-store";
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
    return new PostgresRateLimitStore();
  }

  return new MemoryRateLimitStore();
}
