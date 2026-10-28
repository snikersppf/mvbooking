/** Shared browser/server validation; image URLs are never fetched by the server. */
export function isVehicleImageUrl(value: string): boolean {
  // Browsers normalize backslashes and strip control characters in URLs.
  if (/[\\\u0000-\u0020\u007f]/u.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username === "" && url.password === ""
    );
  } catch {
    return false;
  }
}
