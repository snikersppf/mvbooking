import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '@/server/config/auth';
import { createDefaultRateLimitStore } from '@/server/security/rate-limit/factory';
import { MemoryRateLimitStore } from '@/server/security/rate-limit/memory-store';
import {
  RateLimiter,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '@/server/security/rate-limit/rate-limiter';
import type { RateLimitStore } from '@/server/security/rate-limit/types';

describe('MemoryRateLimitStore', () => {
  it('enforces a fixed window independently for each key', async () => {
    let now = 1_000;
    const store = new MemoryRateLimitStore(() => now);
    const input = { key: 'login:ip:one', limit: 2, windowMs: 10_000 };

    await expect(store.consume(input)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
    await expect(store.consume(input)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(store.consume(input)).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterMs: 10_000,
    });
    await expect(
      store.consume({ ...input, key: 'login:ip:two' }),
    ).resolves.toMatchObject({ allowed: true, remaining: 1 });

    now += 10_000;
    await expect(store.consume(input)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it('rejects invalid limiter parameters', async () => {
    const store = new MemoryRateLimitStore();

    await expect(
      store.consume({ key: '', limit: 0, windowMs: 0 }),
    ).rejects.toBeInstanceOf(TypeError);
  });
});

describe('RateLimiter', () => {
  it('throws a typed 429 error after the limit', async () => {
    const limiter = new RateLimiter(new MemoryRateLimitStore());
    const input = { key: 'register:ip:one', limit: 1, windowMs: 1_000 };

    await expect(limiter.check(input)).resolves.toBeUndefined();
    await expect(limiter.check(input)).rejects.toBeInstanceOf(
      RateLimitExceededError,
    );
  });

  it('fails closed with 503 when its store is unavailable', async () => {
    const unavailableStore: RateLimitStore = {
      consume: async () => {
        throw new Error('store unavailable');
      },
    };
    const limiter = new RateLimiter(unavailableStore);

    await expect(
      limiter.check({ key: 'login:ip:one', limit: 1, windowMs: 1_000 }),
    ).rejects.toBeInstanceOf(RateLimitUnavailableError);
  });
});

describe('createDefaultRateLimitStore', () => {
  it('rejects in-memory storage in production runtime', () => {
    expect(() =>
      createDefaultRateLimitStore({
        NODE_ENV: 'production',
        NEXT_PHASE: undefined,
      }),
    ).toThrow(ConfigurationError);
  });

  it('allows next build without initializing production infrastructure', () => {
    expect(
      createDefaultRateLimitStore({
        NODE_ENV: 'production',
        NEXT_PHASE: 'phase-production-build',
      }),
    ).toBeInstanceOf(MemoryRateLimitStore);
  });

  it('allows the in-memory store outside production', () => {
    expect(
      createDefaultRateLimitStore({
        NODE_ENV: 'test',
        NEXT_PHASE: undefined,
      }),
    ).toBeInstanceOf(MemoryRateLimitStore);
  });
});
