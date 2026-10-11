const PROTECTED_PATHS = ["/account", "/bookings", "/admin"] as const;
const AUTH_PATHS = new Set(["/login", "/register"]);

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getProxyRedirectPath(input: {
  pathname: string;
  search: string;
  authenticated: boolean;
}): string | null {
  const { pathname, authenticated } = input;
  const isProtected = PROTECTED_PATHS.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );

  if (!authenticated && isProtected) {
    const search = input.search.startsWith("?") ? input.search : "";
    const query = new URLSearchParams({
      callbackUrl: `${pathname}${search}`,
    });
    return `/login?${query.toString()}`;
  }

  if (authenticated && AUTH_PATHS.has(pathname)) {
    return "/";
  }

  return null;
}
