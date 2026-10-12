import { UserRole, UserStatus } from "@prisma/client";
import type { LockedUser } from "@/server/repositories/users";
import { AdminServiceError } from "@/server/services/admin/errors";

export type AdminActorCommand = Readonly<{
  actorUserId: string;
  expectedSessionVersion: number;
  requestId?: string;
}>;

export function assertActiveAdminActor(
  user: LockedUser | null,
  expectedSessionVersion: number,
  allowedRoles: readonly UserRole[],
  requestId: string,
): asserts user is LockedUser {
  if (
    !user ||
    user.status !== UserStatus.ACTIVE ||
    user.sessionVersion !== expectedSessionVersion
  ) {
    throw new AdminServiceError(
      "AUTHENTICATION_REQUIRED",
      401,
      "The authenticated user is no longer valid.",
      requestId,
    );
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AdminServiceError(
      "FORBIDDEN",
      403,
      "The user does not have permission for this operation.",
      requestId,
    );
  }
}

export const MANAGER_ADMIN_ROLES = [
  UserRole.MANAGER,
  UserRole.ADMIN,
] as const;
export const ADMIN_ONLY_ROLES = [UserRole.ADMIN] as const;
