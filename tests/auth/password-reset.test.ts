import { createHash } from "node:crypto";
import { UserStatus, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { verifyPassword } from "@/server/security/password";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "@/server/services/users/password-reset";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/server/validators/auth";

describe("password reset validation", () => {
  it("normalizes email and rejects extra fields and weak passwords", () => {
    expect(passwordResetRequestSchema.parse({ email: " USER@EXAMPLE.COM " }))
      .toEqual({ email: "user@example.com" });
    expect(passwordResetRequestSchema.safeParse({ email: "a@example.com", role: "ADMIN" }).success)
      .toBe(false);
    expect(passwordResetConfirmSchema.safeParse({
      token: "a".repeat(43), password: "short",
    }).success).toBe(false);
  });
});

describe("password reset service", () => {
  it.each(["customer@example.test", "missing@example.test", "inactive@example.test"])(
    "queues %s without account lookup, token generation or delivery", async (email) => {
      const create = vi.fn().mockResolvedValue({ id: "notification-1" });
      const findUnique = vi.fn(() => { throw new Error("Account lookup must run in worker"); });
      const createToken = vi.fn(() => { throw new Error("Token generation must run in worker"); });
      const logResetLink = vi.fn();
      const prisma = { notification: { create }, user: { findUnique } } as unknown as PrismaClient;
      await expect(requestPasswordReset({ email }, {
        prisma, production: true, createToken, logResetLink,
      })).resolves.toBeUndefined();
      expect(create).toHaveBeenCalledExactlyOnceWith({ data: {
        type: "PASSWORD_RESET", channel: "EMAIL", payload: { resetEmail: email },
      } });
      expect(findUnique).not.toHaveBeenCalled();
      expect(createToken).not.toHaveBeenCalled();
      expect(logResetLink).not.toHaveBeenCalled();
    },
  );

  it("waits only for durable enqueue and propagates queue failures", async () => {
    let enqueue!: () => void;
    const create = vi.fn(() => new Promise<void>((resolve) => { enqueue = resolve; }));
    const prisma = { notification: { create } } as unknown as PrismaClient;
    let completed = false;
    const request = requestPasswordReset({ email: "customer@example.test" }, { prisma, production: true })
      .then(() => { completed = true; });
    await Promise.resolve();
    expect(completed).toBe(false);
    enqueue();
    await request;
    expect(completed).toBe(true);
    create.mockRejectedValueOnce(new Error("Queue unavailable"));
    await expect(requestPasswordReset({ email: "missing@example.test" }, { prisma, production: true }))
      .rejects.toThrow("Queue unavailable");
  });

  it("stores only a token hash, revokes sessions, and makes tokens one-use", async () => {
    const token = "a".repeat(43);
    const storedHash = createHash("sha256").update(token).digest("hex");
    const now = new Date("2026-10-17T12:00:00Z");
    let stored: { id: string; userId: string; tokenHash: string; expiresAt: Date; consumedAt: Date | null } | null = null;
    let passwordHash: string | null = null;
    let sessionVersion = 2;
    const logResetLink = vi.fn();
    const transaction = {
      passwordResetToken: {
        deleteMany: vi.fn(async () => { stored = null; return { count: 1 }; }),
        create: vi.fn(async ({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) => {
          stored = { id: "token-1", ...data, consumedAt: null };
          return stored;
        }),
        findUnique: vi.fn(async () => stored),
        updateMany: vi.fn(async () => {
          if (!stored || stored.consumedAt) return { count: 0 };
          stored.consumedAt = now;
          return { count: 1 };
        }),
      },
      user: {
        updateMany: vi.fn(async ({ data }: { data: { passwordHash: string } }) => {
          passwordHash = data.passwordHash;
          sessionVersion += 1;
          return { count: 1 };
        }),
      },
    };
    const prisma = {
      user: { findUnique: vi.fn(async () => ({ id: "user-1", status: UserStatus.ACTIVE })) },
      $transaction: async (operation: (client: typeof transaction) => Promise<void>) => operation(transaction),
    } as unknown as PrismaClient;

    await requestPasswordReset({ email: " USER@EXAMPLE.COM " }, {
      prisma, now: () => now, createToken: () => token,
      appOrigin: "https://booking.example", logResetLink, production: false,
    });
    expect(stored).toMatchObject({ tokenHash: storedHash });
    expect(stored).not.toMatchObject({ tokenHash: token });
    expect(logResetLink).toHaveBeenCalledWith(
      `https://booking.example/reset-password?token=${token}`,
    );
    await confirmPasswordReset({ token, password: "new-secure-password" }, {
      prisma, now: () => now,
    });
    expect(sessionVersion).toBe(3);
    expect(passwordHash).not.toBeNull();
    await expect(verifyPassword("new-secure-password", passwordHash ?? ""))
      .resolves.toBe(true);
    await expect(confirmPasswordReset({ token, password: "another-secure-password" }, {
      prisma, now: () => now,
    })).rejects.toMatchObject({ code: "RESET_TOKEN_INVALID" });
  });

  it("returns no token or log for an unknown development account", async () => {
    const logResetLink = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn(async () => null) },
    } as unknown as PrismaClient;
    await expect(requestPasswordReset({ email: "missing@example.com" }, {
      prisma, logResetLink, production: false,
    })).resolves.toBeUndefined();
    expect(logResetLink).not.toHaveBeenCalled();
  });
});
