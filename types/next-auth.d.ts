import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      sessionVersion: number;
      mfaVerified?: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: UserRole;
    status: UserStatus;
    sessionVersion: number;
    mfaVerified?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
    sessionVersion?: number;
    mfaVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    sessionVersion?: number;
    mfaVerified?: boolean;
  }
}

export {};
