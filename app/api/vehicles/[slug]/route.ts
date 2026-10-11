import {
  ApiNotFoundError,
  jsonData,
  PUBLIC_CATALOG_CACHE,
  withApiHandler,
} from "@/server/http/api-response";
import { enforcePublicReadRateLimit } from "@/server/security/api-rate-limit";
import { getCatalogVehicleBySlug } from "@/server/services/catalog/get-vehicle";

type VehicleRouteContext = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export const GET = withApiHandler<[Request, VehicleRouteContext]>(
  "GET /api/vehicles/[slug]",
  async (requestId, request, context) => {
    const [, { slug }] = await Promise.all([
      enforcePublicReadRateLimit(request),
      context.params,
    ]);
    const vehicle = await getCatalogVehicleBySlug(slug);
    if (!vehicle) {
      throw new ApiNotFoundError(
        "VEHICLE_NOT_FOUND",
        "errors.vehicleNotFound",
      );
    }
    return jsonData(vehicle, {
      cacheControl: PUBLIC_CATALOG_CACHE,
      requestId,
    });
  },
);

export const runtime = "nodejs";
