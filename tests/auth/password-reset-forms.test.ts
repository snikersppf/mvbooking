import { describe, expect, it } from "vitest";
import {
  forgotPasswordFormSchema,
  resetPasswordFormSchema,
} from "@/components/auth/form-schemas";

describe("password reset form schemas", () => {
  it("accepts only a valid email for reset requests", () => {
    expect(forgotPasswordFormSchema.safeParse({ email: "user@example.com" }).success)
      .toBe(true);
    expect(forgotPasswordFormSchema.safeParse({ email: "invalid" }).success)
      .toBe(false);
    expect(forgotPasswordFormSchema.safeParse({ email: "user@example.com", role: "ADMIN" }).success)
      .toBe(false);
  });

  it("enforces password length and UTF-8 byte limits", () => {
    expect(resetPasswordFormSchema.safeParse({ password: "strong-password-123" }).success)
      .toBe(true);
    expect(resetPasswordFormSchema.safeParse({ password: "short" }).success)
      .toBe(false);
    expect(resetPasswordFormSchema.safeParse({ password: "🔥".repeat(65) }).success)
      .toBe(false);
  });
});
