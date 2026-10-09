import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../server/security/password";

describe("password security", () => {
  it("accepts the correct password", async () => {
    const encodedHash = await hashPassword("correct horse battery staple");

    await expect(verifyPassword("correct horse battery staple", encodedHash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const encodedHash = await hashPassword("correct horse battery staple");

    await expect(verifyPassword("incorrect password", encodedHash)).resolves.toBe(false);
  });

  it("uses a fresh salt for every hash", async () => {
    const password = "same password for both hashes";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(secondHash);
    expect(firstHash.split(":")[5]).not.toBe(secondHash.split(":")[5]);
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyPassword(password, secondHash)).resolves.toBe(true);
  });
});
