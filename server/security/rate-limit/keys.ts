import { createHmac } from "node:crypto";

export function createPrivateRateLimitKey(
  scope: string,
  identifier: string,
  secret: string,
): string {
  const digest = createHmac("sha256", secret)
    .update(identifier)
    .digest("hex");

  return `${scope}:${digest}`;
}
