import { readVehicleUpload, withVehicleUpload } from "@/server/http/vehicle-upload";
import { adminVehicleCreateSchema } from "@/server/validators/admin";
import { requireRole } from "@/server/auth/guards";
import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { prepareAdminMutation } from "@/server/http/admin-request";
import { queryParamsToObject } from "@/server/http/request";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { executeAdminMutation } from "@/server/services/admin/idempotency";
import {
  createAdminVehicle,
  listAdminVehicles,
} from "@/server/services/admin/vehicles";

export const GET = withApiHandler<[Request]>(
  "GET /api/admin/vehicles",
  async (requestId, request) => {
    await requireRole(MANAGER_ADMIN_ROLES);
    const data = await listAdminVehicles(
      queryParamsToObject(new URL(request.url).searchParams),
    );
    return jsonData(data, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const POST = withApiHandler<[Request]>(
  "POST /api/admin/vehicles",
  async (requestId, request) => {
    const { user } = await prepareAdminMutation(
      request,
      MANAGER_ADMIN_ROLES,
      { readBody: false, allowedMediaTypes: ["application/json", "multipart/form-data"] },
    );
    const upload = await readVehicleUpload(request);
    const body = adminVehicleCreateSchema.parse(upload.payload);
    const vehicle = await withVehicleUpload(upload.files, (store) => executeAdminMutation({
      request, requestId, user, body: { payload: body, files: upload.fingerprint },
      allowedRoles: MANAGER_ADMIN_ROLES,
      operation: async (transaction) => createAdminVehicle({
        actorUserId: user.id,
        expectedSessionVersion: user.sessionVersion,
        vehicle: body,
        images: { images: (await store()).map((url, sortOrder) => ({ url, sortOrder, alt: null })) },
        requestId,
      }, { transaction }),
    }));
    return jsonData(vehicle, {
      status: 201,
      cacheControl: PRIVATE_NO_STORE,
      requestId,
    });
  },
);

export const runtime = "nodejs";
