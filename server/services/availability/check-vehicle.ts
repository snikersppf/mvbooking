import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  availabilityRepository,
  type AvailabilityRepository,
} from "@/server/repositories/availability";
import {
  catalogRepository,
  type CatalogRepository,
} from "@/server/repositories/catalog";
import { calculateBookingDays } from "@/server/services/booking/dates";
import { buildVehicleQuote } from "@/server/services/catalog/catalog-results";
import type { VehicleQuote } from "@/server/services/catalog/types";
import { vehicleAvailabilityQuerySchema } from "@/server/validators/catalog";

export type VehicleAvailabilityResult = Readonly<{
  vehicleId: string;
  startDate: string;
  endDate: string;
  available: boolean;
  quote: VehicleQuote;
}>;

export type CheckVehicleAvailabilityDependencies = Readonly<{
  prisma?: PrismaClient;
  catalogRepository?: Pick<CatalogRepository, "findPublicVehicleById">;
  availabilityRepository?: Pick<AvailabilityRepository, "hasActiveOverlap">;
  now?: () => Date;
}>;

export async function checkVehicleAvailability(
  input: unknown,
  dependencies: CheckVehicleAvailabilityDependencies = {},
): Promise<VehicleAvailabilityResult | null> {
  const query = vehicleAvailabilityQuerySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const vehicle = await (
    dependencies.catalogRepository ?? catalogRepository
  ).findPublicVehicleById(prisma, query.vehicleId);

  if (!vehicle) return null;

  const totalDays = calculateBookingDays(
    { startDate: query.startDate, endDate: query.endDate },
    dependencies.now?.() ?? new Date(),
  );
  const overlap = await (
    dependencies.availabilityRepository ?? availabilityRepository
  ).hasActiveOverlap(prisma, vehicle.id, {
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return {
    vehicleId: vehicle.id,
    startDate: query.startDate.toISOString(),
    endDate: query.endDate.toISOString(),
    available: !overlap,
    quote: buildVehicleQuote(vehicle, totalDays),
  };
}
