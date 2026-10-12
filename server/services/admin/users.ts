import { randomUUID } from "node:crypto";
import { UserRole, UserStatus, type PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  adminEventRepository,
  type AdminEventRepository,
} from "@/server/repositories/admin-events";
import {
  adminUserRepository,
  type AdminUserRepository,
  type LockedAdminUser,
} from "@/server/repositories/admin-users";
import {
  ADMIN_ONLY_ROLES,
  assertActiveAdminActor,
  type AdminActorCommand,
} from "@/server/services/admin/authorization";
import {
  buildAdminPage,
  toAdminUserDto,
  type AdminPage,
  type AdminUserDto,
} from "@/server/services/admin/dto";
import { AdminServiceError } from "@/server/services/admin/errors";
import { runAdminTransaction } from "@/server/services/admin/transaction";
import {
  adminEntityIdSchema,
  adminUserListQuerySchema,
  adminUserRoleSchema,
  adminUserStatusSchema,
} from "@/server/validators/admin";

export type AdminUserDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: AdminUserRepository;
  events?: AdminEventRepository;
  requestId?: () => string;
}>;

type UserMutationCommand = AdminActorCommand & Readonly<{ userId: unknown }>;

function findLockedUser(
  users: readonly LockedAdminUser[],
  id: string,
): LockedAdminUser | null {
  return users.find((user) => user.id === id) ?? null;
}

function requireTargetUser(
  users: readonly LockedAdminUser[],
  id: string,
  requestId: string,
): LockedAdminUser {
  const target = findLockedUser(users, id);
  if (!target) {
    throw new AdminServiceError(
      "USER_NOT_FOUND",
      404,
      "User was not found.",
      requestId,
    );
  }
  return target;
}

function activeAdminCount(users: readonly LockedAdminUser[]): number {
  return users.filter(
    ({ role, status }) =>
      role === UserRole.ADMIN && status === UserStatus.ACTIVE,
  ).length;
}

function assertNotLastActiveAdmin(
  target: LockedAdminUser,
  removesActiveAdmin: boolean,
  administrators: readonly LockedAdminUser[],
  requestId: string,
): void {
  if (
    removesActiveAdmin &&
    target.role === UserRole.ADMIN &&
    target.status === UserStatus.ACTIVE &&
    activeAdminCount(administrators) <= 1
  ) {
    throw new AdminServiceError(
      "LAST_ACTIVE_ADMIN",
      409,
      "The final active administrator cannot be removed or deactivated.",
      requestId,
    );
  }
}

export async function listAdminUsers(
  input: unknown,
  dependencies: AdminUserDependencies = {},
): Promise<AdminPage<AdminUserDto>> {
  const query = adminUserListQuerySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminUserRepository;
  const filters = { role: query.role, status: query.status };
  const offset = (query.page - 1) * query.pageSize;
  const [totalItems, users] = await Promise.all([
    repository.count(prisma, filters),
    repository.findMany(prisma, filters, offset, query.pageSize),
  ]);
  return buildAdminPage(
    users.map(toAdminUserDto),
    query.page,
    query.pageSize,
    totalItems,
  );
}

export async function changeAdminUserRole(
  command: UserMutationCommand & Readonly<{ change: unknown }>,
  dependencies: AdminUserDependencies = {},
): Promise<AdminUserDto> {
  const userId = adminEntityIdSchema.parse(command.userId);
  const change = adminUserRoleSchema.parse(command.change);
  const requestId =
    command.requestId ?? dependencies.requestId?.() ?? randomUUID();
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminUserRepository;
  const events = dependencies.events ?? adminEventRepository;

  const user = await runAdminTransaction(prisma, async (transaction) => {
    const locked = await repository.lockAdministrationUsers(transaction, [
      command.actorUserId,
      userId,
    ]);
    const actor = findLockedUser(locked.users, command.actorUserId);
    assertActiveAdminActor(
      actor,
      command.expectedSessionVersion,
      ADMIN_ONLY_ROLES,
      requestId,
    );
    const target = requireTargetUser(locked.users, userId, requestId);
    assertNotLastActiveAdmin(
      target,
      change.role !== UserRole.ADMIN,
      locked.administrators,
      requestId,
    );
    const updated = await repository.updateRole(
      transaction,
      userId,
      change.role,
    );
    await events.createAudit(transaction, {
      actorUserId: command.actorUserId,
      action: "USER_ROLE_CHANGED",
      entity: "User",
      entityId: userId,
      metadata: {
        requestId,
        previousRole: target.role,
        role: updated.role,
        sessionVersion: updated.sessionVersion,
      },
    });
    return updated;
  });
  return toAdminUserDto(user);
}

export async function changeAdminUserStatus(
  command: UserMutationCommand & Readonly<{ change: unknown }>,
  dependencies: AdminUserDependencies = {},
): Promise<AdminUserDto> {
  const userId = adminEntityIdSchema.parse(command.userId);
  const change = adminUserStatusSchema.parse(command.change);
  const requestId =
    command.requestId ?? dependencies.requestId?.() ?? randomUUID();
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminUserRepository;
  const events = dependencies.events ?? adminEventRepository;

  const user = await runAdminTransaction(prisma, async (transaction) => {
    const locked = await repository.lockAdministrationUsers(transaction, [
      command.actorUserId,
      userId,
    ]);
    const actor = findLockedUser(locked.users, command.actorUserId);
    assertActiveAdminActor(
      actor,
      command.expectedSessionVersion,
      ADMIN_ONLY_ROLES,
      requestId,
    );
    const target = requireTargetUser(locked.users, userId, requestId);
    assertNotLastActiveAdmin(
      target,
      change.status !== UserStatus.ACTIVE,
      locked.administrators,
      requestId,
    );
    const updated = await repository.updateStatus(
      transaction,
      userId,
      change.status,
    );
    await events.createAudit(transaction, {
      actorUserId: command.actorUserId,
      action: "USER_STATUS_CHANGED",
      entity: "User",
      entityId: userId,
      metadata: {
        requestId,
        previousStatus: target.status,
        status: updated.status,
        sessionVersion: updated.sessionVersion,
      },
    });
    return updated;
  });
  return toAdminUserDto(user);
}
