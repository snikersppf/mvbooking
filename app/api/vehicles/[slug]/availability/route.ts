import {
  ApiNotFoundError,
  jsonData,
  PUBLIC_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { queryParamsToObject } from "@/server/http/request";
import { enforcePublicReadRateLimit } from "@/server/security/api-rate-limit";
import { checkVehicleAvailabilityBySlug } from "@/server/services/availability/check-vehicle-by-slug";

type VehicleAvailabilityRouteContext = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export const GET = withApiHandler<
  [Request, VehicleAvailabilityRouteContext]
>(
  "GET /api/vehicles/[slug]/availability",
  async (requestId, request, context) => {
    const [, { slug }] = await Promise.all([
      enforcePublicReadRateLimit(request),
      context.params,
    ]);
    const result = await checkVehicleAvailabilityBySlug(
      slug,
      queryParamsToObject(new URL(request.url).searchParams),
    );
    if (!result) {
      throw new ApiNotFoundError(
        "VEHICLE_NOT_FOUND",
        "errors.vehicleNotFound",
      );
    }
    return jsonData(
      {
        vehicleId: result.vehicleId,
        startDate: result.startDate,
        endDate: result.endDate,
        available: result.available,
      },
      { cacheControl: PUBLIC_NO_STORE, requestId },
    );
  },
);

export const runtime = "nodejs";
