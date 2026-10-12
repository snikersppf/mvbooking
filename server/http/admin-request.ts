import type { UserRole } from "@prisma/client";
import { requireRole } from "@/server/auth/guards";
import type { CurrentUser } from "@/server/auth/current-user";
import { requireAppOrigin } from "@/server/config/http";
import { readJsonBody } from "@/server/http/request";
import { enforceAdminMutationRateLimit } from "@/server/security/api-rate-limit";
import { assertTrustedMutationRequest } from "@/server/security/mutation-request";

export type PreparedAdminMutation = Readonly<{
  user: CurrentUser;
  body: unknown;
}>;

export async function prepareAdminMutation(
  request: Request,
  allowedRoles: readonly UserRole[],
  options: { readBody?: boolean } = {},
): Promise<PreparedAdminMutation> {
  assertTrustedMutationRequest(request, requireAppOrigin());
  const [user, body] = await Promise.all([
    requireRole(allowedRoles),
    options.readBody === false ? Promise.resolve({}) : readJsonBody(request),
  ]);
  await enforceAdminMutationRateLimit(user.id);
  return { user, body };
}
