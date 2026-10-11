import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  catalogRepository,
  type CatalogRepository,
} from "@/server/repositories/catalog";
import { calculateBookingDays } from "@/server/services/booking/dates";
import {
  buildCatalogPage,
  publicVehicleFiltersFromQuery,
} from "@/server/services/catalog/catalog-results";
import type { CatalogPage } from "@/server/services/catalog/types";
import { catalogQuerySchema } from "@/server/validators/catalog";

export type ListCatalogDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: Pick<CatalogRepository, "findPublicVehicles">;
  now?: () => Date;
}>;

export async function listCatalogVehicles(
  input: unknown,
  dependencies: ListCatalogDependencies = {},
): Promise<CatalogPage> {
  const query = catalogQuerySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? catalogRepository;
  const totalDays =
    query.startDate && query.endDate
      ? calculateBookingDays(
          { startDate: query.startDate, endDate: query.endDate },
          dependencies.now?.() ?? new Date(),
        )
      : null;
  const vehicles = await repository.findPublicVehicles(
    prisma,
    publicVehicleFiltersFromQuery(query),
  );

  return buildCatalogPage(vehicles, query, totalDays);
}
