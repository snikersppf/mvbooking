import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const ALGORITHM = "scrypt";
const DEFAULT_N = 16_384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const DEFAULT_KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

type ScryptParameters = {
  N: number;
  r: number;
  p: number;
  keyLength: number;
};

const DEFAULT_PARAMETERS: ScryptParameters = {
  N: DEFAULT_N,
  r: DEFAULT_R,
  p: DEFAULT_P,
  keyLength: DEFAULT_KEY_LENGTH,
};

function deriveKey(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      parameters.keyLength,
      {
        N: parameters.N,
        r: parameters.r,
        p: parameters.p,
        maxmem: MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseHash(encodedHash: string):
  | { parameters: ScryptParameters; salt: Buffer; digest: Buffer }
  | null {
  const parts = encodedHash.split(":");
  if (parts.length !== 6 && parts.length !== 7) return null;

  const [algorithm, nValue, rValue, pValue] = parts;
  const hasExplicitKeyLength = parts.length === 7;
  const saltHex = parts[hasExplicitKeyLength ? 5 : 4];
  const digestHex = parts[hasExplicitKeyLength ? 6 : 5];
  const keyLengthValue = hasExplicitKeyLength
    ? parts[4]
    : String(digestHex.length / 2);

  if (
    algorithm !== ALGORITHM ||
    !/^[0-9a-f]+$/i.test(saltHex) ||
    !/^[0-9a-f]+$/i.test(digestHex) ||
    saltHex.length % 2 !== 0 ||
    digestHex.length % 2 !== 0
  ) {
    return null;
  }

  const N = parsePositiveInteger(nValue);
  const r = parsePositiveInteger(rValue);
  const p = parsePositiveInteger(pValue);
  const keyLength = parsePositiveInteger(keyLengthValue);

  if (
    N === null ||
    r === null ||
    p === null ||
    keyLength === null ||
    N < 2 ** 14 ||
    N > 2 ** 20 ||
    (N & (N - 1)) !== 0 ||
    r > 32 ||
    p > 16 ||
    keyLength > 128 ||
    128 * N * r + 128 * r * p > MAX_MEMORY
  ) {
    return null;
  }

  const salt = Buffer.from(saltHex, "hex");
  const digest = Buffer.from(digestHex, "hex");
  if (salt.length < 16 || digest.length !== keyLength) return null;

  return { parameters: { N, r, p, keyLength }, salt, digest };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const digest = await deriveKey(password, salt, DEFAULT_PARAMETERS);

  return [
    ALGORITHM,
    DEFAULT_PARAMETERS.N,
    DEFAULT_PARAMETERS.r,
    DEFAULT_PARAMETERS.p,
    DEFAULT_PARAMETERS.keyLength,
    salt.toString("hex"),
    digest.toString("hex"),
  ].join(":");
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parsed = parseHash(encodedHash);
  if (!parsed) return false;

  const actualDigest = await deriveKey(password, parsed.salt, parsed.parameters);
  return timingSafeEqual(actualDigest, parsed.digest);
}
