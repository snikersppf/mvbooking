import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { buildLoginHref } from "@/lib/auth/redirect";
import type { CurrentUser } from "@/server/auth/current-user";
import {
  AuthenticationRequiredError,
  ForbiddenError,
} from "@/server/auth/errors";
import { requireRole } from "@/server/auth/guards";

export async function requireAdminPageRole(
  allowedRoles: readonly UserRole[],
  returnPath: string,
  forbiddenRedirect = "/",
): Promise<CurrentUser> {
  await connection();
  try {
    return await requireRole(allowedRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect(buildLoginHref(returnPath));
    }
    if (error instanceof ForbiddenError) {
      redirect(forbiddenRedirect);
    }
    throw error;
  }
}
