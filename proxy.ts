import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProxyRedirectPath } from "@/server/auth/proxy-routing";

export const proxy = auth((request) => {
  const redirectPath = getProxyRedirectPath({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    authenticated: Boolean(request.auth?.user),
  });

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/register",
    "/account/:path*",
    "/bookings/:path*",
    "/admin/:path*",
  ],
};
