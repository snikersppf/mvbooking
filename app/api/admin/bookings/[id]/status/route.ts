import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { prepareAdminMutation } from "@/server/http/admin-request";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { changeAdminBookingStatus } from "@/server/services/admin/bookings";

type AdminBookingStatusRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const PATCH = withApiHandler<
  [Request, AdminBookingStatusRouteContext]
>(
  "PATCH /api/admin/bookings/[id]/status",
  async (requestId, request, context) => {
    const [{ user, body }, { id }] = await Promise.all([
      prepareAdminMutation(request, MANAGER_ADMIN_ROLES),
      context.params,
    ]);
    const booking = await changeAdminBookingStatus({
      actorUserId: user.id,
      expectedSessionVersion: user.sessionVersion,
      bookingId: id,
      change: body,
      requestId,
    });
    return jsonData(booking, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
