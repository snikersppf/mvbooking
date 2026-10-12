import { requireRole } from "@/server/auth/guards";
import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { queryParamsToObject } from "@/server/http/request";
import { ADMIN_ONLY_ROLES } from "@/server/services/admin/authorization";
import { listAdminAuditLogs } from "@/server/services/admin/audit-logs";

export const GET = withApiHandler<[Request]>(
  "GET /api/admin/audit-logs",
  async (requestId, request) => {
    await requireRole(ADMIN_ONLY_ROLES);
    const data = await listAdminAuditLogs(
      queryParamsToObject(new URL(request.url).searchParams),
    );
    return jsonData(data, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
