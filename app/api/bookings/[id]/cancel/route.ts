import { requireCurrentUser } from "@/server/auth/current-user";
import { requireAppOrigin } from "@/server/config/http";
import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import { readJsonBody } from "@/server/http/request";
import { assertTrustedMutationRequest } from "@/server/security/mutation-request";
import { cancelOwnPendingBooking } from "@/server/services/booking/cancel-booking";
import { toCustomerBookingDto } from "@/server/services/booking/customer-booking-dto";
import { cancelBookingBodySchema } from "@/server/validators/booking-api";

type BookingCancelRouteContext = Readonly<{
  params: Promise<{ id: string }>;
}>;

export const PATCH = withApiHandler<[Request, BookingCancelRouteContext]>(
  "PATCH /api/bookings/[id]/cancel",
  async (requestId, request, context) => {
    assertTrustedMutationRequest(request, requireAppOrigin());
    const [user, body, { id }] = await Promise.all([
      requireCurrentUser(),
      readJsonBody(request),
      context.params,
    ]);
    cancelBookingBodySchema.parse(body);
    const booking = await cancelOwnPendingBooking({
      userId: user.id,
      expectedSessionVersion: user.sessionVersion,
      bookingId: id,
      requestId,
    });
    return jsonData(
      { booking: toCustomerBookingDto(booking) },
      { cacheControl: PRIVATE_NO_STORE, requestId },
    );
  },
);

export const runtime = "nodejs";
