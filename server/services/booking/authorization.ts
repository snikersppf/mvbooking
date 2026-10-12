import { UserRole, UserStatus } from "@prisma/client";
import type { LockedUser } from "@/server/repositories/users";
import { BookingServiceError } from "@/server/services/booking/service-errors";

export function assertActiveLockedUser(
  user: LockedUser | null,
  expectedSessionVersion: number,
  requestId: string,
): asserts user is LockedUser {
  if (!user) {
    throw new BookingServiceError(
      "USER_NOT_FOUND",
      404,
      "User was not found.",
      requestId,
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new BookingServiceError(
      "USER_NOT_ACTIVE",
      403,
      "User is not active.",
      requestId,
    );
  }

  if (user.sessionVersion !== expectedSessionVersion) {
    throw new BookingServiceError(
      "SESSION_VERSION_MISMATCH",
      401,
      "Session version is no longer current.",
      requestId,
    );
  }
}

export function assertManagerRole(user: LockedUser, requestId: string): void {
  if (user.role !== UserRole.MANAGER && user.role !== UserRole.ADMIN) {
    throw new BookingServiceError(
      "FORBIDDEN",
      403,
      "Manager or administrator role is required.",
      requestId,
    );
  }
}
