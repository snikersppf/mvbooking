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
import type { VehicleAvailabilityResult } from "@/server/services/availability/check-vehicle";
import { buildVehicleQuote } from "@/server/services/catalog/catalog-results";
import {
  availabilityPeriodQuerySchema,
  vehicleSlugSchema,
} from "@/server/validators/catalog";

export type CheckVehicleBySlugDependencies = Readonly<{
  prisma?: PrismaClient;
  catalogRepository?: Pick<CatalogRepository, "findPublicVehicleBySlug">;
  availabilityRepository?: Pick<AvailabilityRepository, "hasActiveOverlap">;
  now?: () => Date;
}>;

export async function checkVehicleAvailabilityBySlug(
  slugInput: unknown,
  periodInput: unknown,
  dependencies: CheckVehicleBySlugDependencies = {},
): Promise<VehicleAvailabilityResult | null> {
  const slug = vehicleSlugSchema.parse(slugInput);
  const period = availabilityPeriodQuerySchema.parse(periodInput);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const vehicle = await (
    dependencies.catalogRepository ?? catalogRepository
  ).findPublicVehicleBySlug(prisma, slug);

  if (!vehicle) return null;

  const totalDays = calculateBookingDays(
    { startDate: period.startDate, endDate: period.endDate },
    dependencies.now?.() ?? new Date(),
  );
  const overlap = await (
    dependencies.availabilityRepository ?? availabilityRepository
  ).hasActiveOverlap(prisma, vehicle.id, period);

  return {
    vehicleId: vehicle.id,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
    available: !overlap,
    quote: buildVehicleQuote(vehicle, totalDays),
  };
}
