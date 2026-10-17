import { requireAppOrigin } from "@/server/config/http";
import { jsonData, PRIVATE_NO_STORE, withApiHandler } from "@/server/http/api-response";
import { readJsonBody } from "@/server/http/request";
import { assertTrustedMutationRequest } from "@/server/security/mutation-request";
import { enforcePasswordResetRateLimit } from "@/server/security/password-reset-rate-limit";
import { confirmPasswordReset } from "@/server/services/users/password-reset";

export const POST = withApiHandler<[Request]>(
  "POST /api/auth/password-reset/confirm",
  async (requestId, request) => {
    assertTrustedMutationRequest(request, requireAppOrigin());
    await enforcePasswordResetRateLimit(request, "confirm");
    await confirmPasswordReset(await readJsonBody(request));
    return jsonData(
      { reset: true },
      { cacheControl: PRIVATE_NO_STORE, requestId },
    );
  },
);

export const runtime = "nodejs";
