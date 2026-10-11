import {
  jsonData,
  PUBLIC_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { queryParamsToObject } from "@/server/http/request";
import { enforcePublicReadRateLimit } from "@/server/security/api-rate-limit";
import { listAvailableVehicles } from "@/server/services/availability/list-available-vehicles";

export const GET = withApiHandler<[Request]>(
  "GET /api/availability",
  async (requestId, request) => {
    await enforcePublicReadRateLimit(request);
    const data = await listAvailableVehicles(
      queryParamsToObject(new URL(request.url).searchParams),
    );
    return jsonData(data, {
      cacheControl: PUBLIC_NO_STORE,
      requestId,
    });
  },
);

export const runtime = "nodejs";
