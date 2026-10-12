import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { prepareAdminMutation } from "@/server/http/admin-request";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { replaceAdminVehiclePricing } from "@/server/services/admin/vehicles";

type AdminVehiclePricingRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const PUT = withApiHandler<
  [Request, AdminVehiclePricingRouteContext]
>(
  "PUT /api/admin/vehicles/[id]/pricing",
  async (requestId, request, context) => {
    const [{ user, body }, { id }] = await Promise.all([
      prepareAdminMutation(request, MANAGER_ADMIN_ROLES),
      context.params,
    ]);
    const vehicle = await replaceAdminVehiclePricing({
      actorUserId: user.id,
      expectedSessionVersion: user.sessionVersion,
      vehicleId: id,
      pricing: body,
      requestId,
    });
    return jsonData(vehicle, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
