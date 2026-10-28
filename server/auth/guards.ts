import type { UserRole } from "@prisma/client";
import {
  userRepository,
  type UserRepository,
} from "@/server/repositories/users";
import {
  requireCurrentUser,
  type CurrentUser,
  type SessionReader,
} from "./current-user";
import { AuthenticationRequiredError, ForbiddenError } from "./errors";

export async function requireRole(
  allowedRoles: readonly UserRole[],
  repository: UserRepository = userRepository,
  sessionReader?: SessionReader,
): Promise<CurrentUser> {
  const user = await requireCurrentUser(repository, sessionReader);

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError();
  }

  if ((user.role === "ADMIN" || user.role === "MANAGER") && (!user.mfaVerified || !user.totpEnabledAt)) {
    throw new AuthenticationRequiredError();
  }
  return user;
}
