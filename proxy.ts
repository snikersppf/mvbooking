import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import type { NextAuthRequest } from "next-auth";
import { auth } from "@/auth";
import { getProxyRedirectPath } from "@/server/auth/proxy-routing";

const authenticatedProxy = auth((request: NextAuthRequest, _event: NextFetchEvent) => {
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

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Auth.js beta's lazy configuration can return the wrapper asynchronously.
  const handler = await authenticatedProxy;
  return handler(request, event);
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/account/:path*",
    "/bookings/:path*",
    "/admin/:path*",
  ],
};
