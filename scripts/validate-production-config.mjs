import { isIP } from "node:net";

function canonicalOrigin(value) {
  if (!value) throw new Error("Production origin is required.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || url.port) {
    throw new Error("Production URLs must be HTTPS origins without credentials, paths or ports.");
  }
  if (value !== url.origin) throw new Error("Production URLs must be canonical origins without a trailing slash.");
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || isIP(host.replace(/^\[|\]$/g, "")) || /(^|\.)(localhost|local|test|invalid|example)$/.test(host)) {
    throw new Error("Production requires a public DNS hostname.");
  }
  return url.origin;
}

try {
  if (canonicalOrigin(process.env.APP_ORIGIN) !== canonicalOrigin(process.env.AUTH_URL)) {
    throw new Error("APP_ORIGIN and AUTH_URL must identify the same HTTPS origin.");
  }
  if (process.env.TRUST_PROXY_HEADERS !== "true") throw new Error("The private app behind Caddy requires TRUST_PROXY_HEADERS=true.");
  for (const name of ["AUTH_SECRET", "CRON_SECRET"]) {
    if (Buffer.byteLength(process.env[name] ?? "", "utf8") < 32 || /\s/.test(process.env[name] ?? "")) {
      throw new Error(`${name} must contain at least 32 bytes without whitespace.`);
    }
  }
  const mfaKey = process.env.MFA_ENCRYPTION_KEY ?? "";
  if (Buffer.from(mfaKey, "base64").length !== 32 || Buffer.from(mfaKey, "base64").toString("base64") !== mfaKey) {
    throw new Error("MFA_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte key.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
} catch (error) {
  // Never print input values (URL constructors include them in their errors).
  process.stderr.write(error instanceof TypeError ? "Invalid production URL configuration.\n" : `${error.message}\n`);
  process.exitCode = 1;
}
