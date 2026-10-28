import { UserRole, UserStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  authorizeCredentials,
  type CredentialsDependencies,
} from "@/server/auth/credentials";
import type {
  CredentialsUser,
  UserRepository,
} from "@/server/repositories/users";
import { verifyPassword } from "@/server/security/password";
import { MemoryRateLimitStore } from "@/server/security/rate-limit/memory-store";
import { RateLimiter, RateLimitUnavailableError, RateLimitExceededError } from "@/server/security/rate-limit/rate-limiter";

const credentialsUser: CredentialsUser = {
  id: "user_1",
  name: "Nino",
  email: "nino@example.com",
  phone: null,
  role: UserRole.MANAGER,
  status: UserStatus.ACTIVE,
  sessionVersion: 3,
  passwordHash: "stored-password-hash",
};

function createRepository(
  user: CredentialsUser | null = credentialsUser,
): UserRepository {
  return {
    findAuthorizationUserById: vi.fn().mockResolvedValue(null),
    findCredentialsUserByEmail: vi.fn().mockResolvedValue(user),
    createCustomer: vi.fn(),
  };
}

function createDependencies(
  overrides: Partial<CredentialsDependencies> = {},
): CredentialsDependencies {
  return {
    secondFactorVerifier: vi.fn().mockResolvedValue(true),
    repository: createRepository(),
    passwordVerifier: vi.fn().mockResolvedValue(true),
    rateLimiter: {
      check: vi.fn().mockResolvedValue(undefined),
    },
    authSecret: "a".repeat(32),
    trustProxy: false,
    connectionAddress: "127.0.0.1",
    ...overrides,
  };
}

function createRequest(headers?: HeadersInit): Request {
  return new Request("http://localhost/api/auth/callback/credentials", {
    method: "POST",
    headers,
  });
}

describe("authorizeCredentials", () => {
  it("rate-limits before password verification and returns safe user fields", async () => {
    const events: string[] = [];
    const repository = createRepository();
    vi.mocked(repository.findCredentialsUserByEmail).mockImplementation(
      async () => {
        events.push("repository");
        return credentialsUser;
      },
    );
    const passwordVerifier = vi.fn().mockImplementation(async () => {
      events.push("verify");
      return true;
    });
    const rateLimiter = {
      check: vi.fn().mockImplementation(async () => {
        events.push("limit");
      }),
    };
    const dependencies = createDependencies({
      repository,
      passwordVerifier,
      rateLimiter,
    });

    await expect(
      authorizeCredentials(
        {
          email: " NINO@Example.COM ",
          password: "correct horse battery staple",
        },
        createRequest(),
        dependencies,
      ),
    ).resolves.toEqual({
      mfaVerified: true,
      id: credentialsUser.id,
      name: credentialsUser.name,
      email: credentialsUser.email,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      sessionVersion: 3,
    });

    expect(repository.findCredentialsUserByEmail).toHaveBeenCalledWith(
      "nino@example.com",
    );
    expect(events).toEqual(["limit", "limit", "repository", "verify"]);

    const calls = vi.mocked(rateLimiter.check).mock.calls;
    expect(calls[0]?.[0]).toMatchObject({
      key: "login:ip:127.0.0.1",
      limit: 10,
    });
    expect(calls[1]?.[0].key).toMatch(/^login:email:[a-f0-9]{64}$/);
    expect(calls[1]?.[0].key).not.toContain("nino@example.com");
  });

  it("accepts Auth.js transport fields without weakening credential validation", async () => {
    const dependencies = createDependencies();
    await expect(authorizeCredentials(
      {
        email: "nino@example.com",
        password: "correct-password",
        csrfToken: "transport-token",
        callbackUrl: "http://localhost/account/bookings",
      } as Partial<Record<"email" | "password", unknown>>,
      createRequest(),
      dependencies,
    )).resolves.toMatchObject({ id: credentialsUser.id });
    expect(dependencies.repository.findCredentialsUserByEmail)
      .toHaveBeenCalledWith("nino@example.com");
  });

  it("uses one fixed dummy hash when the user does not exist", async () => {
    const repository = createRepository(null);
    const passwordVerifier = vi.fn().mockResolvedValue(false);
    const dependencies = createDependencies({
      repository,
      passwordVerifier,
    });

    await expect(
      authorizeCredentials(
        { email: "first@example.com", password: "first-password" },
        createRequest(),
        dependencies,
      ),
    ).resolves.toBeNull();
    await expect(
      authorizeCredentials(
        { email: "second@example.com", password: "second-password" },
        createRequest(),
        dependencies,
      ),
    ).resolves.toBeNull();

    const firstHash = passwordVerifier.mock.calls[0]?.[1];
    const secondHash = passwordVerifier.mock.calls[1]?.[1];
    expect(firstHash).toMatch(/^scrypt:16384:8:1:64:/);
    expect(secondHash).toBe(firstHash);
    await expect(
      verifyPassword("mvbooking-fixed-dummy-password", firstHash ?? ""),
    ).resolves.toBe(true);
  });

  it("returns the same null result for invalid input, wrong password, and inactive users", async () => {
    const invalidDependencies = createDependencies({
      passwordVerifier: vi.fn().mockResolvedValue(false),
    });
    await expect(
      authorizeCredentials(
        { email: "not-an-email", password: "" },
        createRequest(),
        invalidDependencies,
      ),
    ).resolves.toBeNull();
    expect(invalidDependencies.passwordVerifier).toHaveBeenCalledOnce();

    const wrongPasswordDependencies = createDependencies({
      passwordVerifier: vi.fn().mockResolvedValue(false),
    });
    await expect(
      authorizeCredentials(
        { email: "nino@example.com", password: "wrong-password" },
        createRequest(),
        wrongPasswordDependencies,
      ),
    ).resolves.toBeNull();

    const inactiveDependencies = createDependencies({
      repository: createRepository({
        ...credentialsUser,
        status: UserStatus.SUSPENDED,
      }),
    });
    await expect(
      authorizeCredentials(
        { email: "nino@example.com", password: "correct-password" },
        createRequest(),
        inactiveDependencies,
      ),
    ).resolves.toBeNull();
    expect(inactiveDependencies.passwordVerifier).toHaveBeenCalledOnce();
  });

  it("stops before database lookup and scrypt when rate limited", async () => {
    const repository = createRepository();
    const passwordVerifier = vi.fn();
    const dependencies = createDependencies({
      repository,
      passwordVerifier,
      rateLimiter: {
        check: vi.fn().mockRejectedValue(new RateLimitExceededError(1_000)),
      },
    });

    await expect(
      authorizeCredentials(
        { email: "nino@example.com", password: "correct-password" },
        createRequest(),
        dependencies,
      ),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
    expect(repository.findCredentialsUserByEmail).not.toHaveBeenCalled();
    expect(passwordVerifier).not.toHaveBeenCalled();
  });

  it("recovers after the login window without weakening the per-email limit", async () => {
    let now = 0;
    const dependencies = createDependencies({ rateLimiter: new RateLimiter(new MemoryRateLimitStore(() => now)) });
    const input = { email: credentialsUser.email, password: "correct-password", otp: "123456" };
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(authorizeCredentials(input, createRequest(), dependencies)).resolves.toMatchObject({ mfaVerified: true });
    }
    await expect(authorizeCredentials(input, createRequest(), dependencies)).rejects.toMatchObject({ code: "RATE_LIMIT_EXCEEDED" });
    now += 10 * 60 * 1000;
    await expect(authorizeCredentials(input, createRequest(), dependencies)).resolves.toMatchObject({ mfaVerified: true });
  });

  it("does not misreport a limiter outage as a credentials rejection", async () => {
    const dependencies = createDependencies({ rateLimiter: { check: vi.fn().mockRejectedValue(new RateLimitUnavailableError()) } });
    await expect(authorizeCredentials({ email: credentialsUser.email, password: "correct-password" }, createRequest(), dependencies))
      .rejects.toBeInstanceOf(RateLimitUnavailableError);
    expect(dependencies.repository.findCredentialsUserByEmail).not.toHaveBeenCalled();
  });

  it("uses a forwarded IP only when trusted proxy mode is enabled", async () => {
    const rateLimiter = {
      check: vi.fn().mockResolvedValue(undefined),
    };
    const dependencies = createDependencies({
      rateLimiter,
      trustProxy: true,
      connectionAddress: null,
    });

    await authorizeCredentials(
      { email: "nino@example.com", password: "correct-password" },
      createRequest({ "x-forwarded-for": "203.0.113.8, 10.0.0.2" }),
      dependencies,
    );

    expect(rateLimiter.check).toHaveBeenCalledWith(
      expect.objectContaining({ key: "login:ip:203.0.113.8" }),
    );
  });
});

it("refuses customer login even with the correct password", async () => {
  const dependencies = createDependencies({ repository: createRepository({ ...credentialsUser, role: UserRole.CUSTOMER }) });
  await expect(authorizeCredentials({ email: credentialsUser.email, password: "correct-password" }, createRequest(), dependencies)).resolves.toBeNull();
});

it("requires a successful server-side second factor before issuing identity", async () => {
  const dependencies = createDependencies({ secondFactorVerifier: vi.fn().mockResolvedValue(false) });
  await expect(authorizeCredentials({ email: credentialsUser.email, password: "correct-password", otp: "123456" }, createRequest(), dependencies)).resolves.toBeNull();
  expect(dependencies.secondFactorVerifier).toHaveBeenCalledWith(credentialsUser, "123456");
});
