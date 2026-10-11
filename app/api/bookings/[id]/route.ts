import { requireCurrentUser } from "@/server/auth/current-user";
import {
  ApiNotFoundError,
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { getCustomerBooking } from "@/server/services/booking/get-customer-bookings";

type BookingRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const GET = withApiHandler<[Request, BookingRouteContext]>(
  "GET /api/bookings/[id]",
  async (requestId, _request, context) => {
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      context.params,
    ]);
    const booking = await getCustomerBooking(user.id, id);
    if (!booking) {
      throw new ApiNotFoundError(
        "BOOKING_NOT_FOUND",
        "errors.bookingNotFound",
      );
    }
    return jsonData(booking, {
      cacheControl: PRIVATE_NO_STORE,
      requestId,
    });
  },
);

export const runtime = "nodejs";
