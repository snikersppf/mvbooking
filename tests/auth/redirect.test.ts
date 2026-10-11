import { describe, expect, it } from "vitest";
import { normalizeCallbackPath } from "@/lib/auth/redirect";

describe("normalizeCallbackPath", () => {
  it("preserves a local path, query, and fragment", () => {
    expect(normalizeCallbackPath("/bookings?page=2#current")).toBe(
      "/bookings?page=2#current",
    );
  });

  it.each([
    undefined,
    null,
    "",
    "bookings",
    "https://evil.example/account",
    "//evil.example/account",
    "/\\evil.example/account",
    "/login",
    "/register",
  ])("falls back to root for an unsafe callback: %s", (value) => {
    expect(normalizeCallbackPath(value)).toBe("/");
  });
});
