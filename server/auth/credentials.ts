import { UserStatus, type User } from "@prisma/client";
import { requireAuthSecret, trustProxyHeaders } from "@/server/config/auth";
import {
  userRepository,
  type UserRepository,
} from "@/server/repositories/users";
import { requireRateLimitClientIp, resolveClientIp } from "@/server/security/client-ip";
import { verifyPassword } from "@/server/security/password";
import { createDefaultRateLimitStore } from "@/server/security/rate-limit/factory";
import { createPrivateRateLimitKey } from "@/server/security/rate-limit/keys";
import { RateLimiter } from "@/server/security/rate-limit/rate-limiter";
import type { RateLimitInput } from "@/server/security/rate-limit/types";
import { credentialsSchema } from "@/server/validators/auth";

const LOGIN_IP_LIMIT = 10;
const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const INVALID_EMAIL_BUCKET = "<invalid-email>";
const INVALID_PASSWORD = "invalid-credentials";

const DUMMY_PASSWORD_HASH =
  "scrypt:16384:8:1:64:4d56426f6f6b696e674175746844756d:" +
  "12411a067d598555b34e67cc75f503236c51c6c4a4b20153354e29de176bcf" +
  "344fc4f4823fb7c5f437c0f3d06c2b04e30c5d66ec83403c4b2edddaa00d40ddc1";

export type AuthorizedCredentialsUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "status" | "sessionVersion"
>;

type RateLimiterLike = {
  check(input: RateLimitInput): Promise<void>;
};

export type CredentialsDependencies = {
  repository: UserRepository;
  passwordVerifier: (
    password: string,
    encodedHash: string,
  ) => Promise<boolean>;
  rateLimiter: RateLimiterLike;
  authSecret: string;
  trustProxy: boolean;
  connectionAddress: string | null;
};

let credentialsRateLimiter: RateLimiter | undefined;

function getCredentialsRateLimiter(): RateLimiter {
  credentialsRateLimiter ??= new RateLimiter(
    createDefaultRateLimitStore(),
  );
  return credentialsRateLimiter;
}

function createDefaultDependencies(): CredentialsDependencies {
  return {
    repository: userRepository,
    passwordVerifier: verifyPassword,
    rateLimiter: getCredentialsRateLimiter(),
    authSecret: requireAuthSecret(),
    trustProxy: trustProxyHeaders(),
    connectionAddress: null,
  };
}

function emailForRateLimit(value: unknown): string {
  if (typeof value !== "string") return INVALID_EMAIL_BUCKET;

  const normalized = value.trim().toLowerCase().slice(0, 254);
  return normalized || INVALID_EMAIL_BUCKET;
}

export async function authorizeCredentials(
  rawCredentials: Partial<Record<"email" | "password", unknown>>,
  request: Request,
  dependencies: CredentialsDependencies = createDefaultDependencies(),
): Promise<AuthorizedCredentialsUser | null> {
  const emailBucket = emailForRateLimit(rawCredentials.email);
  const clientIp = resolveClientIp({
    connectionAddress: dependencies.connectionAddress,
    headers: request.headers,
    trustProxy: dependencies.trustProxy,
  });
  const emailKey = createPrivateRateLimitKey(
    "login:email",
    emailBucket,
    dependencies.authSecret,
  );

  await Promise.all([
    dependencies.rateLimiter.check({
      key: `login:ip:${requireRateLimitClientIp(clientIp)}`,
      limit: LOGIN_IP_LIMIT,
      windowMs: LOGIN_WINDOW_MS,
    }),
    dependencies.rateLimiter.check({
      key: emailKey,
      limit: LOGIN_EMAIL_LIMIT,
      windowMs: LOGIN_WINDOW_MS,
    }),
  ]);

  const parsed = credentialsSchema.safeParse(rawCredentials);
  const user = parsed.success
    ? await dependencies.repository.findCredentialsUserByEmail(
        parsed.data.email,
      )
    : null;
  const password = parsed.success ? parsed.data.password : INVALID_PASSWORD;
  const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await dependencies.passwordVerifier(
    password,
    passwordHash,
  );

  if (
    !parsed.success ||
    !user ||
    user.status !== UserStatus.ACTIVE ||
    !passwordMatches
  ) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    sessionVersion: user.sessionVersion,
  };
}
