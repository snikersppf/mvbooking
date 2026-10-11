import { describe, expect, it } from "vitest";
import { getProxyRedirectPath } from "@/server/auth/proxy-routing";

describe("getProxyRedirectPath", () => {
  it.each(["/account", "/account/profile", "/bookings", "/admin/users"])(
    "sends an anonymous request for %s to login",
    (pathname) => {
      expect(
        getProxyRedirectPath({
          pathname,
          search: "?page=2",
          authenticated: false,
        }),
      ).toBe(
        `/login?callbackUrl=${encodeURIComponent(`${pathname}?page=2`)}`,
      );
    },
  );

  it("does not treat a similar public segment as protected", () => {
    expect(
      getProxyRedirectPath({
        pathname: "/administrator",
        search: "",
        authenticated: false,
      }),
    ).toBeNull();
  });

  it.each(["/login", "/register"])(
    "redirects an authenticated user away from %s",
    (pathname) => {
      expect(
        getProxyRedirectPath({
          pathname,
          search: "",
          authenticated: true,
        }),
      ).toBe("/");
    },
  );

  it("allows an authenticated request to continue to a protected page", () => {
    expect(
      getProxyRedirectPath({
        pathname: "/bookings/booking_1",
        search: "",
        authenticated: true,
      }),
    ).toBeNull();
  });
});
