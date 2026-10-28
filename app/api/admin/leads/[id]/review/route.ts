import { requireRole } from "@/server/auth/guards";
import { requireAppOrigin } from "@/server/config/http";
import { jsonData, PRIVATE_NO_STORE, withApiHandler } from "@/server/http/api-response";
import { enforceAdminMutationRateLimit } from "@/server/security/api-rate-limit";
import { assertTrustedMutationRequest } from "@/server/security/mutation-request";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { reviewLead } from "@/server/services/leads/admin";

type Context = { params: Promise<{ id: string }> };
export const POST = withApiHandler<[Request, Context]>("POST /api/admin/leads/:id/review", async (requestId, request, context) => {
  assertTrustedMutationRequest(request, requireAppOrigin());
  const actor = await requireRole(MANAGER_ADMIN_ROLES);
  await enforceAdminMutationRateLimit(actor.id);
  const lead = await reviewLead((await context.params).id);
  return jsonData({ lead }, { cacheControl: PRIVATE_NO_STORE, requestId });
});
