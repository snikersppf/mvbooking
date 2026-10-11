import {
  jsonData,
  PUBLIC_CATALOG_CACHE,
  withApiHandler,
} from "@/server/http/api-response";
import { queryParamsToObject } from "@/server/http/request";
import { enforcePublicReadRateLimit } from "@/server/security/api-rate-limit";
import { listCatalogVehicles } from "@/server/services/catalog/list-vehicles";

export const GET = withApiHandler<[Request]>(
  "GET /api/vehicles",
  async (requestId, request) => {
    await enforcePublicReadRateLimit(request);
    const data = await listCatalogVehicles(
      queryParamsToObject(new URL(request.url).searchParams),
    );
    return jsonData(data, {
      cacheControl: PUBLIC_CATALOG_CACHE,
      requestId,
    });
  },
);

export const runtime = "nodejs";
