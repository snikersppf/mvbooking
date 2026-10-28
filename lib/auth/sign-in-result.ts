type SignInResult = Readonly<{ ok: boolean; error?: string; code?: string }>;

export function signInErrorMessage(result: SignInResult): string | null {
  // Auth.js may return HTTP 200 (ok=true) for a rejected credentials callback.
  if (result.error === "CredentialsSignin") {
    return result.code === "login_rate_limited"
      ? "Too many sign-in attempts. Wait 10 minutes before trying again."
      : "Email, password or security code is incorrect.";
  }
  if (result.error || !result.ok) return "Sign in is temporarily unavailable. Try again later.";
  return null;
}
