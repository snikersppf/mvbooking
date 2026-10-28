import { UserRole, UserStatus } from "@prisma/client";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import {
  jwtCallback,
  sessionCallback,
} from "@/server/auth/callbacks";

const user: User = {
  id: "user_1",
  name: "Nino",
  email: "nino@example.com",
  image: null,
  role: UserRole.MANAGER,
  status: UserStatus.ACTIVE,
  sessionVersion: 7,
  mfaVerified: true,
};

function createSession(): Session {
  return {
    expires: "2026-11-09T00:00:00.000Z",
    user: {
      id: "original",
      name: "Nino",
      email: "nino@example.com",
      image: null,
      role: UserRole.CUSTOMER,
      sessionVersion: 1,
    },
  };
}

describe("Auth.js callbacks", () => {
  it("stores server-issued identity fields in the JWT on sign-in", () => {
    expect(jwtCallback({ token: {}, user })).toMatchObject({
      sub: "user_1",
      role: UserRole.MANAGER,
      sessionVersion: 7,
      mfaVerified: true,
    });
  });

  it("does not accept client session data when there is no sign-in user", () => {
    const token: JWT = {
      sub: "user_1",
      role: UserRole.MANAGER,
      sessionVersion: 7,
    };

    expect(jwtCallback({ token })).toBe(token);
    expect(token).toEqual({
      sub: "user_1",
      role: UserRole.MANAGER,
      sessionVersion: 7,
    });
  });

  it("copies only validated token identity into the public session", () => {
    const session = createSession();

    expect(
      sessionCallback({
        session,
        token: {
          sub: "user_1",
          role: UserRole.ADMIN,
          sessionVersion: 9,
        },
      }),
    ).toMatchObject({
      user: {
        id: "user_1",
        role: UserRole.ADMIN,
        sessionVersion: 9,
      },
    });
  });

  it("clears session identity from a malformed token", () => {
    const session = createSession();

    sessionCallback({
      session,
      token: {
        sub: "",
        role: "NOT_A_ROLE",
        sessionVersion: -1,
      } as unknown as JWT,
    });

    expect(session.user).not.toHaveProperty("id");
    expect(session.user).not.toHaveProperty("role");
    expect(session.user).not.toHaveProperty("sessionVersion");
    expect(session.user.name).toBe("Nino");
  });
});

it("uses only the server token proof when building session MFA state", () => {
  const session = createSession(); session.user.mfaVerified = true;
  sessionCallback({ session, token: { sub: "staff", role: UserRole.ADMIN, sessionVersion: 1, mfaVerified: false } });
  expect(session.user.mfaVerified).toBe(false);
});
