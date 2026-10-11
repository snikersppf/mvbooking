export function requireTestDatabaseUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = env.DATABASE_URL;
  if (!value) {
    throw new Error(
      "Integration tests require an explicit DATABASE_URL for a *_test database.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Integration test DATABASE_URL must be a valid URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Integration tests require a PostgreSQL DATABASE_URL.");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Integration test database name must end with _test; refusing to continue.",
    );
  }

  return value;
}
