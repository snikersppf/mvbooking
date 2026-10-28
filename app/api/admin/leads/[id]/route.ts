import { requireRole } from "@/server/auth/guards";
import { requireAppOrigin } from "@/server/config/http";
import { jsonData, PRIVATE_NO_STORE, withApiHandler } from "@/server/http/api-response";
import { readJsonBody } from "@/server/http/request";
import { enforceAdminMutationRateLimit } from "@/server/security/api-rate-limit";
import { assertTrustedMutationRequest } from "@/server/security/mutation-request";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { updateLead } from "@/server/services/leads/admin";

type Context = { params: Promise<{ id: string }> };
export const PATCH = withApiHandler<[Request, Context]>("PATCH /api/admin/leads/:id", async (requestId, request, context) => {
  assertTrustedMutationRequest(request, requireAppOrigin());
  const actor = await requireRole(MANAGER_ADMIN_ROLES);
  await enforceAdminMutationRateLimit(actor.id);
  const lead = await updateLead((await context.params).id, await readJsonBody(request));
  return jsonData({ lead }, { cacheControl: PRIVATE_NO_STORE, requestId });
});
