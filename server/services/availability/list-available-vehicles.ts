import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  availabilityRepository,
  type AvailabilityRepository,
} from "@/server/repositories/availability";
import { calculateBookingDays } from "@/server/services/booking/dates";
import {
  buildCatalogPage,
  publicVehicleFiltersFromQuery,
} from "@/server/services/catalog/catalog-results";
import type { CatalogPage } from "@/server/services/catalog/types";
import { availableVehicleListQuerySchema } from "@/server/validators/catalog";

export type ListAvailableVehiclesDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: Pick<AvailabilityRepository, "findAvailableVehicles">;
  now?: () => Date;
}>;

export async function listAvailableVehicles(
  input: unknown,
  dependencies: ListAvailableVehiclesDependencies = {},
): Promise<CatalogPage> {
  const query = availableVehicleListQuerySchema.parse(input);
  const totalDays = calculateBookingDays(
    { startDate: query.startDate, endDate: query.endDate },
    dependencies.now?.() ?? new Date(),
  );
  const vehicles = await (
    dependencies.repository ?? availabilityRepository
  ).findAvailableVehicles(
    dependencies.prisma ?? getPrismaClient(),
    publicVehicleFiltersFromQuery(query),
    { startDate: query.startDate, endDate: query.endDate },
  );

  return buildCatalogPage(vehicles, query, totalDays);
}
