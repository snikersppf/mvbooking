import { requireAppOrigin } from "@/server/config/http";
import { jsonData, PRIVATE_NO_STORE, withApiHandler } from "@/server/http/api-response";
import { readJsonBody } from "@/server/http/request";
import { enforceLeadRateLimit } from "@/server/security/lead-rate-limit";
import { assertTrustedMutationRequest } from "@/server/security/mutation-request";
import { createLead } from "@/server/services/leads/create";

export const POST = withApiHandler<[Request]>("POST /api/leads", async (requestId, request) => {
  assertTrustedMutationRequest(request, requireAppOrigin());
  await enforceLeadRateLimit(request);
  await createLead(await readJsonBody(request));
  return jsonData({ accepted: true }, { status: 202, cacheControl: PRIVATE_NO_STORE, requestId });
});
export const runtime = "nodejs";
