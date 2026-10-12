import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { prepareAdminMutation } from "@/server/http/admin-request";
import {
  ADMIN_ONLY_ROLES,
  MANAGER_ADMIN_ROLES,
} from "@/server/services/admin/authorization";
import {
  archiveAdminVehicle,
  updateAdminVehicle,
} from "@/server/services/admin/vehicles";

type AdminVehicleRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const PATCH = withApiHandler<[Request, AdminVehicleRouteContext]>(
  "PATCH /api/admin/vehicles/[id]",
  async (requestId, request, context) => {
    const [{ user, body }, { id }] = await Promise.all([
      prepareAdminMutation(request, MANAGER_ADMIN_ROLES),
      context.params,
    ]);
    const vehicle = await updateAdminVehicle({
      actorUserId: user.id,
      expectedSessionVersion: user.sessionVersion,
      vehicleId: id,
      patch: body,
      requestId,
    });
    return jsonData(vehicle, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const DELETE = withApiHandler<[Request, AdminVehicleRouteContext]>(
  "DELETE /api/admin/vehicles/[id]",
  async (requestId, request, context) => {
    const [{ user }, { id }] = await Promise.all([
      prepareAdminMutation(request, ADMIN_ONLY_ROLES, { readBody: false }),
      context.params,
    ]);
    const vehicle = await archiveAdminVehicle({
      actorUserId: user.id,
      expectedSessionVersion: user.sessionVersion,
      vehicleId: id,
      requestId,
    });
    return jsonData(vehicle, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
