const FALLBACK_PATH = "/";
const LOCAL_BASE_URL = "https://local.invalid";

export function normalizeCallbackPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return FALLBACK_PATH;
  }

  try {
    const url = new URL(value, LOCAL_BASE_URL);
    if (url.origin !== LOCAL_BASE_URL) return FALLBACK_PATH;
    if (url.pathname === "/login" || url.pathname === "/register") {
      return FALLBACK_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK_PATH;
  }
}
