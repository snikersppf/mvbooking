import { UserRole, type UserRole as UserRoleValue } from "@prisma/client";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

type JwtCallbackInput = {
  token: JWT;
  user?: User;
};

type SessionCallbackInput = {
  session: Session;
  token: JWT;
};

function isUserRole(value: unknown): value is UserRoleValue {
  return (
    typeof value === "string" &&
    Object.values(UserRole).includes(value as UserRoleValue)
  );
}

function isSessionVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function jwtCallback({
  token,
  user,
}: JwtCallbackInput): JWT {
  if (!user) return token;

  token.mfaVerified = user.mfaVerified === true;
  token.sub = user.id;
  token.role = user.role;
  token.sessionVersion = user.sessionVersion;

  return token;
}

export function sessionCallback({
  session,
  token,
}: SessionCallbackInput): Session {
  if (!session.user) return session;

  if (
    typeof token.sub !== "string" ||
    token.sub.length === 0 ||
    !isUserRole(token.role) ||
    !isSessionVersion(token.sessionVersion)
  ) {
    const unsafeUser = session.user as Partial<Session["user"]>;
    delete unsafeUser.mfaVerified;
    delete unsafeUser.id;
    delete unsafeUser.role;
    delete unsafeUser.sessionVersion;
  } else {
    session.user.mfaVerified = token.mfaVerified === true;
    session.user.id = token.sub;
    session.user.role = token.role;
    session.user.sessionVersion = token.sessionVersion;
  }

  return session;
}
