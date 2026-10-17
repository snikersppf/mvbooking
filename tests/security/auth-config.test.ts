import { describe, expect, it } from 'vitest';
import {
  ConfigurationError,
  requireAuthSecret,
  trustProxyHeaders,
} from '@/server/config/auth';
import { requireRateLimitClientIp, resolveClientIp } from '@/server/security/client-ip';
import { RateLimitUnavailableError } from '@/server/security/rate-limit/rate-limiter';
import { createPrivateRateLimitKey } from '@/server/security/rate-limit/keys';

describe('Auth.js environment configuration', () => {
  it('requires AUTH_SECRET with at least 32 UTF-8 bytes', () => {
    expect(() => requireAuthSecret({ AUTH_SECRET: undefined })).toThrow(
      ConfigurationError,
    );
    expect(() => requireAuthSecret({ AUTH_SECRET: 'a'.repeat(31) })).toThrow(
      ConfigurationError,
    );
    expect(requireAuthSecret({ AUTH_SECRET: 'я'.repeat(16) })).toBe(
      'я'.repeat(16),
    );
  });

  it('trusts proxy headers only after an explicit boolean setting', () => {
    expect(trustProxyHeaders({ TRUST_PROXY_HEADERS: undefined })).toBe(false);
    expect(trustProxyHeaders({ TRUST_PROXY_HEADERS: 'false' })).toBe(false);
    expect(trustProxyHeaders({ TRUST_PROXY_HEADERS: 'true' })).toBe(true);
    expect(() =>
      trustProxyHeaders({ TRUST_PROXY_HEADERS: 'yes' }),
    ).toThrow(ConfigurationError);
  });
});

describe('resolveClientIp', () => {
  const forwardedHeaders = new Headers({
    'x-forwarded-for': '203.0.113.8, 10.0.0.2',
    'x-real-ip': '203.0.113.9',
  });

  it('uses the direct connection address when the proxy is not trusted', () => {
    expect(
      resolveClientIp({
        connectionAddress: '::ffff:127.0.0.1',
        headers: forwardedHeaders,
        trustProxy: false,
      }),
    ).toBe('127.0.0.1');
  });

  it('uses the first forwarded address only for an explicitly trusted proxy', () => {
    expect(
      resolveClientIp({
        connectionAddress: '10.0.0.2',
        headers: forwardedHeaders,
        trustProxy: true,
      }),
    ).toBe('203.0.113.8');
  });

  it('falls back to the connection address for invalid forwarded values', () => {
    expect(
      resolveClientIp({
        connectionAddress: '192.0.2.10',
        headers: new Headers({ 'x-forwarded-for': 'not-an-ip' }),
        trustProxy: true,
      }),
    ).toBe('192.0.2.10');
  });

  it('fails closed in production when no trusted IP is available', () => {
    expect(() => requireRateLimitClientIp(null, { NODE_ENV: 'production' }))
      .toThrow(RateLimitUnavailableError);
    expect(requireRateLimitClientIp('203.0.113.8', { NODE_ENV: 'production' }))
      .toBe('203.0.113.8');
  });
});

describe('createPrivateRateLimitKey', () => {
  it('does not expose the normalized email in the key', () => {
    const key = createPrivateRateLimitKey(
      'login:email',
      'customer@example.com',
      'a'.repeat(32),
    );

    expect(key).toMatch(/^login:email:[a-f0-9]{64}$/);
    expect(key).not.toContain('customer@example.com');
  });
});
