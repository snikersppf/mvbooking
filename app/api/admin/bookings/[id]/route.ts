import { requireRole } from "@/server/auth/guards";
import {
  ApiNotFoundError,
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { getAdminBooking } from "@/server/services/admin/bookings";

type AdminBookingRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const GET = withApiHandler<[Request, AdminBookingRouteContext]>(
  "GET /api/admin/bookings/[id]",
  async (requestId, _request, context) => {
    const [, { id }] = await Promise.all([
      requireRole(MANAGER_ADMIN_ROLES),
      context.params,
    ]);
    const booking = await getAdminBooking(id);
    if (!booking) {
      throw new ApiNotFoundError(
        "BOOKING_NOT_FOUND",
        "errors.bookingNotFound",
      );
    }
    return jsonData(booking, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
