import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "@/lib/auth/sign-in-result";
import { createTranslator } from "@/lib/i18n/translate";

describe("Auth.js sign-in results", () => {
  it("rejects invalid credentials even when the callback returns HTTP 200", () => {
    expect(signInErrorMessage({ ok: true, error: "CredentialsSignin", code: "credentials" }))
      .toBe("Email, password or security code is incorrect.");
  });
  it("shows the same localized cooldown message for all rate-limited accounts", () => {
    const message = signInErrorMessage({ ok: true, error: "CredentialsSignin", code: "login_rate_limited" });
    expect(message).toBe("Too many sign-in attempts. Wait 10 minutes before trying again.");
    expect(createTranslator("ru")(message!)).toBe("Слишком много попыток входа. Подождите 10 минут перед следующей попыткой.");
  });
  it("reports infrastructure errors without treating them as a successful login", () => {
    expect(signInErrorMessage({ ok: true, error: "Configuration" })).toContain("temporarily unavailable");
    expect(signInErrorMessage({ ok: false })).toContain("temporarily unavailable");
  });
  it("accepts a successful callback with no error", () => {
    expect(signInErrorMessage({ ok: true })).toBeNull();
  });
});
