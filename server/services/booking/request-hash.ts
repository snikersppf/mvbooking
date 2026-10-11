import { createHash } from "node:crypto";
import type { CreateBookingInput } from "@/server/validators/booking";

export function createBookingRequestHash(
  userId: string,
  input: CreateBookingInput,
): string {
  const canonicalPayload = JSON.stringify({
    userId,
    vehicleId: input.vehicleId,
    startDate: input.startDate.toISOString(),
    endDate: input.endDate.toISOString(),
    pickupLocation: input.pickupLocation,
    returnLocation: input.returnLocation,
    customerComment: input.customerComment ?? null,
  });

  return createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
}
