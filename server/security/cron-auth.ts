import { timingSafeEqual } from "node:crypto";
import { ConfigurationError } from "@/server/config/auth";
import { ApiRequestError } from "@/server/http/api-response";

export function assertCronAuthorization(
  authorization: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): void {
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new ConfigurationError("CRON_SECRET must contain at least 32 bytes.");
  }

  const match = /^Bearer ([^\s]+)$/.exec(authorization ?? "");
  const supplied = Buffer.from(match?.[1] ?? "", "utf8");
  const expected = Buffer.from(secret, "utf8");
  if (
    !match ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new ApiRequestError(401, "CRON_UNAUTHORIZED", "errors.authenticationRequired");
  }
}
