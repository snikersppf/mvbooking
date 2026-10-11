import { requireCurrentUser } from "@/server/auth/current-user";
import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { toCurrentUserProfile } from "@/server/services/users/current-user-profile";

export const GET = withApiHandler<[Request]>(
  "GET /api/me",
  async (requestId) => {
    const user = await requireCurrentUser();
    return jsonData(toCurrentUserProfile(user), {
      cacheControl: PRIVATE_NO_STORE,
      requestId,
    });
  },
);

export const runtime = "nodejs";
