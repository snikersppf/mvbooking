import { jsonData, PRIVATE_NO_STORE, withApiHandler } from "@/server/http/api-response";
import { assertCronAuthorization } from "@/server/security/cron-auth";
import { cancelExpiredPendingBookings } from "@/server/services/booking/cancel-expired-bookings";

export const POST = withApiHandler<[Request]>(
  "POST /api/cron/cancel-expired",
  async (requestId, request) => {
    assertCronAuthorization(request.headers.get("authorization"));
    const cancelled = await cancelExpiredPendingBookings();
    return jsonData({ cancelled }, { cacheControl: PRIVATE_NO_STORE, requestId });
  },
);

export const runtime = "nodejs";
