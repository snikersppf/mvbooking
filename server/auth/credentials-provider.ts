import { CredentialsSignin } from "next-auth";
import { authorizeCredentials } from "./credentials";
import { RateLimitExceededError } from "@/server/security/rate-limit/rate-limiter";

/** Public code contains no account, limiter-key or retry-state details. */
export class LoginRateLimitedError extends CredentialsSignin {
  code = "login_rate_limited";
}

/** Translate expected throttling only at the Auth.js boundary. */
export async function authorizeCredentialsForAuth(...args: Parameters<typeof authorizeCredentials>) {
  try {
    return await authorizeCredentials(...args);
  } catch (error) {
    if (error instanceof RateLimitExceededError) throw new LoginRateLimitedError();
    throw error;
  }
}
