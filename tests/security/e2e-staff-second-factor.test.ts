import { describe, expect, it, vi } from "vitest";
import { createStaffSecondFactor } from "@/tests/e2e/staff-second-factor";
import { totpAt } from "@/server/security/totp";

const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const now = Date.parse("2026-10-28T12:00:00Z");
const step = Math.floor(now / 30_000);
const backups = ["a".repeat(32), "b".repeat(32)];

describe("E2E staff second-factor isolation", () => {
  it("computes the current TOTP after reading the consumed step", async () => {
    let clock = now - 1;
    const readStep = vi.fn(async () => { clock = now; return -1; });
    const next = createStaffSecondFactor(secret, backups, readStep, () => clock);
    expect(await next()).toEqual({ code: totpAt(secret, step), kind: "totp" });
    expect(readStep).toHaveBeenCalledOnce();
  });

  it("uses distinct backup codes for same-step retries and refuses to reuse them", async () => {
    const next = createStaffSecondFactor(secret, backups, async () => -1, () => now);
    expect((await next()).kind).toBe("totp");
    expect(await next()).toEqual({ code: backups[0], kind: "backup" });
    expect(await next()).toEqual({ code: backups[1], kind: "backup" });
    await expect(next()).rejects.toThrow("No unused fixture backup codes remain");
  });

  it("does not reissue a step already consumed in the database", async () => {
    const next = createStaffSecondFactor(secret, backups, async () => step, () => now);
    expect(await next()).toEqual({ code: backups[0], kind: "backup" });
  });

  it("returns to TOTP when the next unconsumed step starts", async () => {
    let clock = now;
    const next = createStaffSecondFactor(secret, backups, async () => step, () => clock);
    expect((await next()).kind).toBe("backup");
    clock += 30_000;
    expect(await next()).toEqual({ code: totpAt(secret, step + 1), kind: "totp" });
  });

  it("issues a TOTP step only once even to concurrent callers", async () => {
    const next = createStaffSecondFactor(secret, backups, async () => -1, () => now);
    const results = await Promise.all([next(), next(), next()]);
    expect(results.map((factor) => factor.kind)).toEqual(["totp", "backup", "backup"]);
    expect(new Set(results.map((factor) => factor.code)).size).toBe(3);
  });

  it("keeps issuance state independent for separate staff fixtures", async () => {
    const first = createStaffSecondFactor(secret, backups, async () => -1, () => now);
    const second = createStaffSecondFactor("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", backups, async () => -1, () => now);
    await first();
    expect((await first()).kind).toBe("backup");
    expect((await second()).kind).toBe("totp");
  });
});
