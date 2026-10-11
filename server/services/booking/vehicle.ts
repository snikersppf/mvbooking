import { VehicleStatus } from "@prisma/client";
import { BookingRuleError } from "@/server/services/booking/errors";

export function assertVehicleAvailable(status: VehicleStatus): void {
  if (status !== VehicleStatus.AVAILABLE) {
    throw new BookingRuleError(
      "VEHICLE_UNAVAILABLE",
      "Only an available vehicle can be booked.",
    );
  }
}
