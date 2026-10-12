import { requireRole } from "@/server/auth/guards";
import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { queryParamsToObject } from "@/server/http/request";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { listAdminBookings } from "@/server/services/admin/bookings";

export const GET = withApiHandler<[Request]>(
  "GET /api/admin/bookings",
  async (requestId, request) => {
    await requireRole(MANAGER_ADMIN_ROLES);
    const data = await listAdminBookings(
      queryParamsToObject(new URL(request.url).searchParams),
    );
    return jsonData(data, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
