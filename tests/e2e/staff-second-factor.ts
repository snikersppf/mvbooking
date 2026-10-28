import { totpAt } from "@/server/security/totp";

type SecondFactor = Readonly<{ code: string; kind: "totp" | "backup" }>;

/** Each fixture owns its provider. Never issue the same TOTP step twice. */
export function createStaffSecondFactor(
  secret: string,
  backupCodes: readonly string[],
  lastConsumedStep: () => Promise<number>,
  now: () => number = Date.now,
): () => Promise<SecondFactor> {
  let lastIssuedStep = -1;
  const unusedBackups = [...backupCodes];
  return async () => {
    const consumed = await lastConsumedStep();
    const step = Math.floor(now() / 30_000);
    if (step > Math.max(lastIssuedStep, consumed)) {
      lastIssuedStep = step;
      return { code: totpAt(secret, step), kind: "totp" };
    }
    // A retry in the same step uses a distinct one-use code, without sleeping.
    const code = unusedBackups.shift();
    if (!code) throw new Error("No unused fixture backup codes remain; create a new staff fixture.");
    return { code, kind: "backup" };
  };
}
