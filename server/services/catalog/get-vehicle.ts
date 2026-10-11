import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  catalogRepository,
  type CatalogRepository,
} from "@/server/repositories/catalog";
import type { CatalogVehicleDetail } from "@/server/services/catalog/types";
import { vehicleSlugSchema } from "@/server/validators/catalog";

export type GetCatalogVehicleDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: Pick<CatalogRepository, "findPublicVehicleBySlug">;
}>;

export async function getCatalogVehicleBySlug(
  input: unknown,
  dependencies: GetCatalogVehicleDependencies = {},
): Promise<CatalogVehicleDetail | null> {
  const slug = vehicleSlugSchema.parse(input);
  const repository = dependencies.repository ?? catalogRepository;
  const vehicle = await repository.findPublicVehicleBySlug(
    dependencies.prisma ?? getPrismaClient(),
    slug,
  );

  if (!vehicle) return null;

  return {
    id: vehicle.id,
    slug: vehicle.slug,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    category: vehicle.category,
    description: vehicle.description,
    seats: vehicle.seats,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    drive: vehicle.drive,
    engine: vehicle.engine,
    depositAmount: vehicle.depositAmount.toFixed(2),
    currency: vehicle.currency,
    insuranceIncluded: vehicle.insuranceIncluded,
    location: vehicle.location,
    images: vehicle.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt ?? `${vehicle.brand} ${vehicle.model}`,
    })),
    pricingRules: vehicle.pricingRules.map((rule) => ({
      id: rule.id,
      minDays: rule.minDays,
      maxDays: rule.maxDays,
      pricePerDay: rule.pricePerDay.toFixed(2),
      currency: rule.currency,
    })),
  };
}
