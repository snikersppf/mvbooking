import { Prisma, VehicleStatus, type PrismaClient } from "@prisma/client";

export type PublicVehicleFilters = Readonly<{
  category?: string;
  seats?: number;
  transmission?: string;
  fuel?: string;
  drive?: string;
}>;

export const catalogVehicleListSelect = {
  id: true,
  slug: true,
  brand: true,
  model: true,
  year: true,
  category: true,
  seats: true,
  transmission: true,
  fuel: true,
  drive: true,
  depositAmount: true,
  currency: true,
  insuranceIncluded: true,
  location: true,
  images: {
    orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
    take: 1,
    select: { id: true, url: true, alt: true },
  },
  pricingRules: {
    orderBy: { minDays: "asc" as const },
    select: {
      id: true,
      minDays: true,
      maxDays: true,
      pricePerDay: true,
      currency: true,
    },
  },
} satisfies Prisma.VehicleSelect;

export const catalogVehicleDetailSelect = {
  ...catalogVehicleListSelect,
  description: true,
  engine: true,
  images: {
    orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
    select: { id: true, url: true, alt: true, sortOrder: true },
  },
} satisfies Prisma.VehicleSelect;

export type CatalogVehicleRecord = Prisma.VehicleGetPayload<{
  select: typeof catalogVehicleListSelect;
}>;

export type CatalogVehicleDetailRecord = Prisma.VehicleGetPayload<{
  select: typeof catalogVehicleDetailSelect;
}>;

export interface CatalogRepository {
  findPublicVehicles(
    client: PrismaClient,
    filters: PublicVehicleFilters,
  ): Promise<CatalogVehicleRecord[]>;
  findPublicVehicleById(
    client: PrismaClient,
    id: string,
  ): Promise<CatalogVehicleRecord | null>;
  findPublicVehicleBySlug(
    client: PrismaClient,
    slug: string,
  ): Promise<CatalogVehicleDetailRecord | null>;
}

export function publicVehicleWhere(
  filters: PublicVehicleFilters,
): Prisma.VehicleWhereInput {
  return {
    status: VehicleStatus.AVAILABLE,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.seats ? { seats: { gte: filters.seats } } : {}),
    ...(filters.transmission
      ? { transmission: filters.transmission }
      : {}),
    ...(filters.fuel ? { fuel: filters.fuel } : {}),
    ...(filters.drive ? { drive: filters.drive } : {}),
  };
}

export class PrismaCatalogRepository implements CatalogRepository {
  findPublicVehicles(
    client: PrismaClient,
    filters: PublicVehicleFilters,
  ): Promise<CatalogVehicleRecord[]> {
    return client.vehicle.findMany({
      where: publicVehicleWhere(filters),
      select: catalogVehicleListSelect,
    });
  }

  findPublicVehicleById(
    client: PrismaClient,
    id: string,
  ): Promise<CatalogVehicleRecord | null> {
    return client.vehicle.findFirst({
      where: { id, status: VehicleStatus.AVAILABLE },
      select: catalogVehicleListSelect,
    });
  }

  findPublicVehicleBySlug(
    client: PrismaClient,
    slug: string,
  ): Promise<CatalogVehicleDetailRecord | null> {
    return client.vehicle.findFirst({
      where: { slug, status: VehicleStatus.AVAILABLE },
      select: catalogVehicleDetailSelect,
    });
  }
}

export const catalogRepository: CatalogRepository =
  new PrismaCatalogRepository();
