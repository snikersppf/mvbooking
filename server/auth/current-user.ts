import { UserStatus } from "@prisma/client";
import type { Session } from "next-auth";
import {
  userRepository,
  type AuthorizationUser,
  type UserRepository,
} from "@/server/repositories/users";
import {
  AuthenticationRequiredError,
  AuthInfrastructureError,
} from "./errors";
import type { SessionIdentity } from "./session-identity";

export type CurrentUser = AuthorizationUser & {
  status: typeof UserStatus.ACTIVE;
};

export type SessionReader = () => Promise<Session | null>;

async function readAuthSession(): Promise<Session | null> {
  const { auth } = await import("@/auth");
  return auth();
}

export async function requireCurrentUserFromIdentity(
  identity: SessionIdentity | null,
  repository: UserRepository = userRepository,
): Promise<CurrentUser> {
  if (!identity?.userId || !Number.isSafeInteger(identity.sessionVersion)) {
    throw new AuthenticationRequiredError();
  }

  let user: AuthorizationUser | null;
  try {
    user = await repository.findAuthorizationUserById(identity.userId);
  } catch (error) {
    throw new AuthInfrastructureError({ cause: error });
  }

  if (
    !user ||
    user.status !== UserStatus.ACTIVE ||
    user.sessionVersion !== identity.sessionVersion
  ) {
    throw new AuthenticationRequiredError();
  }

  return user as CurrentUser;
}

export async function requireCurrentUser(
  repository: UserRepository = userRepository,
  sessionReader: SessionReader = readAuthSession,
): Promise<CurrentUser> {
  let session: Session | null;
  try {
    session = await sessionReader();
  } catch (error) {
    throw new AuthInfrastructureError({ cause: error });
  }

  const identity: SessionIdentity | null =
    session?.user &&
    typeof session.user.id === "string" &&
    session.user.id.length > 0 &&
    Number.isSafeInteger(session.user.sessionVersion)
      ? {
          userId: session.user.id,
          sessionVersion: session.user.sessionVersion,
        }
      : null;

  return requireCurrentUserFromIdentity(identity, repository);
}
