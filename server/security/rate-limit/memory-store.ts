import type {
  RateLimitInput,
  RateLimitResult,
  RateLimitStore,
} from "./types";

type Entry = {
  count: number;
  resetAt: number;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, Entry>();
  private operations = 0;

  constructor(private readonly now: () => number = Date.now) {}

  async consume(input: RateLimitInput): Promise<RateLimitResult> {
    if (
      !input.key ||
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      !Number.isSafeInteger(input.windowMs) ||
      input.windowMs < 1
    ) {
      throw new TypeError("Invalid rate-limit input.");
    }

    const now = this.now();
    const existing = this.entries.get(input.key);
    const entry =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + input.windowMs }
        : existing;

    entry.count += 1;
    this.entries.set(input.key, entry);
    this.pruneExpiredEntries(now);

    return {
      allowed: entry.count <= input.limit,
      remaining: Math.max(0, input.limit - entry.count),
      retryAfterMs: Math.max(0, entry.resetAt - now),
    };
  }

  private pruneExpiredEntries(now: number): void {
    this.operations += 1;
    if (this.operations % 128 !== 0) return;

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }
}
