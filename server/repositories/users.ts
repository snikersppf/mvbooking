import {
  Prisma,
  UserRole,
  UserStatus,
  type User,
} from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";

export type AuthorizationUser = Pick<
  User,
  "id" | "name" | "email" | "phone" | "role" | "status" | "sessionVersion"
> & { totpEnabledAt?: Date | null };

export type CredentialsUser = AuthorizationUser &
  Pick<User, "passwordHash">;

export type PublicUser = Pick<
  User,
  "id" | "name" | "email" | "phone" | "role" | "status" | "createdAt"
>;

export type LockedUser = Pick<
  User,
  "id" | "role" | "status" | "sessionVersion"
>;

export type CreateCustomerInput = {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
};

export interface UserRepository {
  findAuthorizationUserById(id: string): Promise<AuthorizationUser | null>;
  findCredentialsUserByEmail(email: string): Promise<CredentialsUser | null>;
  createCustomer(input: CreateCustomerInput): Promise<PublicUser>;
}

export class DuplicateUserEmailError extends Error {
  constructor() {
    super("A user with this email already exists.");
    this.name = "DuplicateUserEmailError";
  }
}

const authorizationSelect = {
  totpEnabledAt: true,
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  sessionVersion: true,
} satisfies Prisma.UserSelect;

export class PrismaUserRepository implements UserRepository {
  async findAuthorizationUserById(
    id: string,
  ): Promise<AuthorizationUser | null> {
    return getPrismaClient().user.findUnique({
      where: { id },
      select: authorizationSelect,
    });
  }

  async findCredentialsUserByEmail(
    email: string,
  ): Promise<CredentialsUser | null> {
    return getPrismaClient().user.findUnique({
      where: { email },
      select: {
        ...authorizationSelect,
        passwordHash: true,
      },
    });
  }

  async createCustomer(input: CreateCustomerInput): Promise<PublicUser> {
    try {
      return await getPrismaClient().user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash: input.passwordHash,
          role: UserRole.CUSTOMER,
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DuplicateUserEmailError();
      }
      throw error;
    }
  }
}

export const userRepository: UserRepository = new PrismaUserRepository();

export async function lockUserById(
  transaction: Prisma.TransactionClient,
  id: string,
): Promise<LockedUser | null> {
  const rows = await transaction.$queryRaw<LockedUser[]>`
    SELECT "id", "role", "status", "sessionVersion"
    FROM "User"
    WHERE "id" = ${id}
    FOR UPDATE
  `;

  return rows[0] ?? null;
}
