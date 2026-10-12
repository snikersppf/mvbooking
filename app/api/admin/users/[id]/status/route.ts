import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { prepareAdminMutation } from "@/server/http/admin-request";
import { ADMIN_ONLY_ROLES } from "@/server/services/admin/authorization";
import { changeAdminUserStatus } from "@/server/services/admin/users";

type AdminUserStatusRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const PATCH = withApiHandler<[Request, AdminUserStatusRouteContext]>(
  "PATCH /api/admin/users/[id]/status",
  async (requestId, request, context) => {
    const [{ user, body }, { id }] = await Promise.all([
      prepareAdminMutation(request, ADMIN_ONLY_ROLES),
      context.params,
    ]);
    const updatedUser = await changeAdminUserStatus({
      actorUserId: user.id,
      expectedSessionVersion: user.sessionVersion,
      userId: id,
      change: body,
      requestId,
    });
    return jsonData(updatedUser, {
      cacheControl: PRIVATE_NO_STORE,
      requestId,
    });
  },
);

export const runtime = "nodejs";
