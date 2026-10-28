import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ConfigurationError } from "@/server/config/auth";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(): string {
  let bits = 0, value = 0, result = "";
  for (const byte of randomBytes(20)) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; result += ALPHABET[(value >>> bits) & 31]; }
  }
  return result;
}
function secretBytes(secret: string): Buffer {
  if (!/^[A-Z2-7]{32}$/.test(secret)) throw new Error("Invalid TOTP secret.");
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of secret) {
    value = (value << 5) | ALPHABET.indexOf(char); bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  return Buffer.from(bytes);
}
export function totpAt(secret: string, counter: number, digits = 6): string {
  if (!Number.isSafeInteger(counter) || counter < 0 || ![6, 8].includes(digits)) throw new Error("Invalid TOTP counter.");
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secretBytes(secret)).update(buffer).digest();
  const offset = mac[mac.length - 1]! & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, "0");
}
export function matchTotp(secret: string, code: string, now = new Date()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now.getTime() / 30_000);
  for (const counter of [current + 1, current, current - 1]) {
    if (counter >= 0 && timingSafeEqual(Buffer.from(totpAt(secret, counter)), Buffer.from(code))) return counter;
  }
  return null;
}
function encryptionKey(env: Readonly<Record<string, string | undefined>>): Buffer {
  const value = env.MFA_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) throw new ConfigurationError("MFA_ENCRYPTION_KEY must be a canonical base64-encoded 32-byte key.");
  return key;
}
export function encryptTotpSecret(secret: string, userId: string, env = process.env): string {
  secretBytes(secret);
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(env), iv);
  cipher.setAAD(Buffer.from(`mvbooking:totp:v1:${userId}`));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}
export function decryptTotpSecret(encoded: string, userId: string, env = process.env): string {
  const [version, iv, tag, encrypted, extra] = encoded.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted || extra) throw new Error("Invalid encrypted TOTP data.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(env), Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(`mvbooking:totp:v1:${userId}`));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const secret = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  secretBytes(secret);
  return secret;
}
export function backupCodeHash(userId: string, code: string): string {
  return createHash("sha256").update(`staff-backup/${userId}/${code.toLowerCase()}`).digest("hex");
}
