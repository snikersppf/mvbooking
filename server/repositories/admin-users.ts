import {
  Prisma,
  UserRole,
  type PrismaClient,
  type User,
  type UserStatus,
} from "@prisma/client";

type ReadClient = PrismaClient | Prisma.TransactionClient;

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  sessionVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type AdminUserRecord = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;

export type AdminUserFilters = Readonly<{
  role?: UserRole;
  status?: UserStatus;
}>;

export type LockedAdminUser = Pick<
  User,
  "id" | "name" | "email" | "phone" | "role" | "status" | "sessionVersion" | "createdAt" | "updatedAt"
>;

export type LockedAdministrationUsers = Readonly<{
  users: LockedAdminUser[];
  administrators: LockedAdminUser[];
}>;

export interface AdminUserRepository {
  count(client: ReadClient, filters: AdminUserFilters): Promise<number>;
  findMany(
    client: ReadClient,
    filters: AdminUserFilters,
    offset: number,
    limit: number,
  ): Promise<AdminUserRecord[]>;
  lockAdministrationUsers(
    transaction: Prisma.TransactionClient,
    userIds: readonly string[],
  ): Promise<LockedAdministrationUsers>;
  updateRole(
    transaction: Prisma.TransactionClient,
    id: string,
    role: UserRole,
  ): Promise<AdminUserRecord>;
  updateStatus(
    transaction: Prisma.TransactionClient,
    id: string,
    status: UserStatus,
  ): Promise<AdminUserRecord>;
}

const ADMINISTRATION_LOCK_KEY = "mvbooking:user-role-status";

function userWhere(filters: AdminUserFilters): Prisma.UserWhereInput {
  return {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}

export class PrismaAdminUserRepository implements AdminUserRepository {
  count(client: ReadClient, filters: AdminUserFilters): Promise<number> {
    return client.user.count({ where: userWhere(filters) });
  }

  findMany(
    client: ReadClient,
    filters: AdminUserFilters,
    offset: number,
    limit: number,
  ): Promise<AdminUserRecord[]> {
    return client.user.findMany({
      where: userWhere(filters),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: adminUserSelect,
    });
  }

  async lockAdministrationUsers(
    transaction: Prisma.TransactionClient,
    userIds: readonly string[],
  ): Promise<LockedAdministrationUsers> {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${ADMINISTRATION_LOCK_KEY}))
    `;

    const administrators = await transaction.$queryRaw<LockedAdminUser[]>`
      SELECT
        "id", "name", "email", "phone", "role", "status",
        "sessionVersion", "createdAt", "updatedAt"
      FROM "User"
      WHERE "role" = ${UserRole.ADMIN}
      ORDER BY "id"
      FOR UPDATE
    `;

    const uniqueIds = [...new Set(userIds)].sort();
    const users =
      uniqueIds.length === 0
        ? []
        : await transaction.$queryRaw<LockedAdminUser[]>(
            Prisma.sql`
              SELECT
                "id", "name", "email", "phone", "role", "status",
                "sessionVersion", "createdAt", "updatedAt"
              FROM "User"
              WHERE "id" IN (${Prisma.join(uniqueIds)})
              ORDER BY "id"
              FOR UPDATE
            `,
          );

    return { users, administrators };
  }

  updateRole(
    transaction: Prisma.TransactionClient,
    id: string,
    role: UserRole,
  ): Promise<AdminUserRecord> {
    return transaction.user.update({
      where: { id },
      data: { role, sessionVersion: { increment: 1 } },
      select: adminUserSelect,
    });
  }

  updateStatus(
    transaction: Prisma.TransactionClient,
    id: string,
    status: UserStatus,
  ): Promise<AdminUserRecord> {
    return transaction.user.update({
      where: { id },
      data: { status, sessionVersion: { increment: 1 } },
      select: adminUserSelect,
    });
  }
}

export const adminUserRepository: AdminUserRepository =
  new PrismaAdminUserRepository();
