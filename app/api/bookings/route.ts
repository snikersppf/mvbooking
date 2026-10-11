import { requireCurrentUser } from "@/server/auth/current-user";
import { requireAppOrigin } from "@/server/config/http";
import {
  jsonData,
  PRIVATE_NO_STORE,
  withApiHandler,
} from "@/server/http/api-response";
import {
  queryParamsToObject,
  readJsonBody,
} from "@/server/http/request";
import { assertTrustedMutationRequest } from "@/server/security/mutation-request";
import { enforceBookingCreateRateLimit } from "@/server/security/api-rate-limit";
import { createBooking } from "@/server/services/booking/create-booking";
import { toCustomerBookingDto } from "@/server/services/booking/customer-booking-dto";
import { listCustomerBookings } from "@/server/services/booking/get-customer-bookings";

export const GET = withApiHandler<[Request]>(
  "GET /api/bookings",
  async (requestId, request) => {
    const user = await requireCurrentUser();
    const data = await listCustomerBookings(
      user.id,
      queryParamsToObject(new URL(request.url).searchParams),
    );
    return jsonData(data, {
      cacheControl: PRIVATE_NO_STORE,
      requestId,
    });
  },
);

export const POST = withApiHandler<[Request]>(
  "POST /api/bookings",
  async (requestId, request) => {
    assertTrustedMutationRequest(request, requireAppOrigin());
    const [user, body] = await Promise.all([
      requireCurrentUser(),
      readJsonBody(request),
    ]);
    await enforceBookingCreateRateLimit(user.id);
    const result = await createBooking({
      userId: user.id,
      expectedSessionVersion: user.sessionVersion,
      booking: body,
      idempotencyKey: request.headers.get("idempotency-key"),
      requestId,
    });
    return jsonData(
      {
        booking: toCustomerBookingDto(result.booking),
        replayed: result.replayed,
      },
      {
        status: result.replayed ? 200 : 201,
        cacheControl: PRIVATE_NO_STORE,
        requestId,
      },
    );
  },
);

export const runtime = "nodejs";
