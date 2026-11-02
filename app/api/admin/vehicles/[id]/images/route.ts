import { readVehicleUpload, withVehicleUpload } from "@/server/http/vehicle-upload";
import { adminImagesReplaceSchema } from "@/server/validators/admin";
import {
  ApiRequestError,
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
    const [{ user }, { id }] = await Promise.all([
      prepareAdminMutation(request, MANAGER_ADMIN_ROLES, { readBody: false, allowedMediaTypes: ["application/json", "multipart/form-data"] }),
      context.params,
    ]);
    const upload = await readVehicleUpload(request);
    const body = adminImagesReplaceSchema.parse(upload.payload);
    if (body.images.length + upload.files.length > 30) {
      throw new ApiRequestError(400, "INVALID_UPLOAD", "errors.validation");
    }
    const vehicle = await withVehicleUpload(upload.files, (store) => executeAdminMutation({
      request, requestId, user, body: { payload: body, files: upload.fingerprint },
      allowedRoles: MANAGER_ADMIN_ROLES,
      operation: async (transaction) => replaceAdminVehicleImages({
        actorUserId: user.id,
        expectedSessionVersion: user.sessionVersion,
        vehicleId: id,
        images: { images: [...body.images, ...(await store()).map((url, index) => ({
          url, alt: null, sortOrder: Math.max(-1, ...body.images.map((image) => image.sortOrder)) + index + 1,
        }))] },
        requestId,
      }, { transaction }),
    }));
    return jsonData(vehicle, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
