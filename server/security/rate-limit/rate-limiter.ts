import type { RateLimitInput, RateLimitStore } from "./types";

export class RateLimitExceededError extends Error {
  readonly code = "RATE_LIMIT_EXCEEDED";
  readonly status = 429;

  constructor(readonly retryAfterMs: number) {
    super("Rate limit exceeded.");
    this.name = "RateLimitExceededError";
  }
}

export class RateLimitUnavailableError extends Error {
  readonly code = "RATE_LIMIT_UNAVAILABLE";
  readonly status = 503;

  constructor(options?: ErrorOptions) {
    super("Rate-limit store is unavailable.", options);
    this.name = "RateLimitUnavailableError";
  }
}

export class RateLimiter {
  constructor(private readonly store: RateLimitStore) {}

  async check(input: RateLimitInput): Promise<void> {
    let result;
    try {
      result = await this.store.consume(input);
    } catch (error) {
      throw new RateLimitUnavailableError({ cause: error });
    }

    if (!result.allowed) {
      throw new RateLimitExceededError(result.retryAfterMs);
    }
  }
}
