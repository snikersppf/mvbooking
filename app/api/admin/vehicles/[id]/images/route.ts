import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { prepareAdminMutation } from "@/server/http/admin-request";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { replaceAdminVehicleImages } from "@/server/services/admin/vehicles";
import { executeAdminMutation } from "@/server/services/admin/idempotency";

type AdminVehicleImagesRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const PUT = withApiHandler<
  [Request, AdminVehicleImagesRouteContext]
>(
  "PUT /api/admin/vehicles/[id]/images",
  async (requestId, request, context) => {
    const [{ user, body }, { id }] = await Promise.all([
      prepareAdminMutation(request, MANAGER_ADMIN_ROLES),
      context.params,
    ]);
    const vehicle = await executeAdminMutation({
      request, requestId, user, body,
      allowedRoles: MANAGER_ADMIN_ROLES,
      operation: (transaction) => replaceAdminVehicleImages({
        actorUserId: user.id,
        expectedSessionVersion: user.sessionVersion,
        vehicleId: id,
        images: body,
        requestId,
      }, { transaction }),
    });
    return jsonData(vehicle, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
