import { handlers } from "@/auth";
import { withRouteHandlerErrorLogging } from "@/server/http/route-handler-errors";

export const GET = withRouteHandlerErrorLogging(
  "GET /api/auth/[...nextauth]",
  handlers.GET,
);
export const POST = withRouteHandlerErrorLogging(
  "POST /api/auth/[...nextauth]",
  handlers.POST,
);
export const runtime = "nodejs";
