import {
  BookingStatus,
  Prisma,
  type PrismaClient,
  type Vehicle,
  type VehicleStatus,
} from "@prisma/client";

type ReadClient = PrismaClient | Prisma.TransactionClient;

export const adminVehicleSelect = {
  id: true,
  slug: true,
  brand: true,
  model: true,
  year: true,
  category: true,
  description: true,
  seats: true,
  transmission: true,
  fuel: true,
  drive: true,
  engine: true,
  depositAmount: true,
  currency: true,
  insuranceIncluded: true,
  status: true,
  location: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
    select: { id: true, url: true, alt: true, sortOrder: true },
  },
  pricingRules: {
    orderBy: [{ minDays: "asc" as const }, { id: "asc" as const }],
    select: {
      id: true,
      minDays: true,
      maxDays: true,
      pricePerDay: true,
      currency: true,
    },
  },
} satisfies Prisma.VehicleSelect;

export type AdminVehicleRecord = Prisma.VehicleGetPayload<{
  select: typeof adminVehicleSelect;
}>;

export type AdminVehicleFilters = Readonly<{
  status?: VehicleStatus;
  category?: string;
}>;

export type AdminVehicleCreateData = Omit<
  Prisma.VehicleUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt"
>;
export type AdminVehicleUpdateData = Pick<
  Prisma.VehicleUncheckedUpdateInput,
  | "slug"
  | "brand"
  | "model"
  | "year"
  | "category"
  | "description"
  | "seats"
  | "transmission"
  | "fuel"
  | "drive"
  | "engine"
  | "depositAmount"
  | "insuranceIncluded"
  | "status"
  | "location"
>;

export type AdminPricingRuleData = Readonly<{
  minDays: number;
  maxDays: number | null;
  pricePerDay: Prisma.Decimal;
  currency: string;
}>;

export type AdminVehicleImageData = Readonly<{
  url: string;
  alt: string | null;
  sortOrder: number;
}>;

export interface AdminVehicleRepository {
  count(client: ReadClient, filters: AdminVehicleFilters): Promise<number>;
  findMany(
    client: ReadClient,
    filters: AdminVehicleFilters,
    offset: number,
    limit: number,
  ): Promise<AdminVehicleRecord[]>;
  findById(client: ReadClient, id: string): Promise<AdminVehicleRecord | null>;
  lockById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<Vehicle | null>;
  create(
    transaction: Prisma.TransactionClient,
    data: AdminVehicleCreateData,
  ): Promise<AdminVehicleRecord>;
  update(
    transaction: Prisma.TransactionClient,
    id: string,
    data: AdminVehicleUpdateData,
  ): Promise<AdminVehicleRecord>;
  lockFutureActiveBookings(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    now: Date,
  ): Promise<string[]>;
  replacePricing(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    rules: readonly AdminPricingRuleData[],
  ): Promise<void>;
  replaceImages(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    images: readonly AdminVehicleImageData[],
  ): Promise<void>;
}

function vehicleWhere(filters: AdminVehicleFilters): Prisma.VehicleWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };
}

export class PrismaAdminVehicleRepository
  implements AdminVehicleRepository
{
  count(client: ReadClient, filters: AdminVehicleFilters): Promise<number> {
    return client.vehicle.count({ where: vehicleWhere(filters) });
  }

  findMany(
    client: ReadClient,
    filters: AdminVehicleFilters,
    offset: number,
    limit: number,
  ): Promise<AdminVehicleRecord[]> {
    return client.vehicle.findMany({
      where: vehicleWhere(filters),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: adminVehicleSelect,
    });
  }

  findById(
    client: ReadClient,
    id: string,
  ): Promise<AdminVehicleRecord | null> {
    return client.vehicle.findUnique({
      where: { id },
      select: adminVehicleSelect,
    });
  }

  async lockById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<Vehicle | null> {
    const rows = await transaction.$queryRaw<Vehicle[]>`
      SELECT
        "id", "slug", "brand", "model", "year", "category",
        "description", "seats", "transmission", "fuel", "drive",
        "engine", "depositAmount", "currency", "insuranceIncluded",
        "status", "location", "createdAt", "updatedAt"
      FROM "Vehicle"
      WHERE "id" = ${id}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  create(
    transaction: Prisma.TransactionClient,
    data: AdminVehicleCreateData,
  ): Promise<AdminVehicleRecord> {
    return transaction.vehicle.create({ data, select: adminVehicleSelect });
  }

  update(
    transaction: Prisma.TransactionClient,
    id: string,
    data: AdminVehicleUpdateData,
  ): Promise<AdminVehicleRecord> {
    return transaction.vehicle.update({
      where: { id },
      data,
      select: adminVehicleSelect,
    });
  }

  async lockFutureActiveBookings(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    now: Date,
  ): Promise<string[]> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Booking"
      WHERE "vehicleId" = ${vehicleId}
        AND "status" IN (${BookingStatus.PENDING}, ${BookingStatus.CONFIRMED})
        AND "endDate" > ${now}
      ORDER BY "id"
      FOR UPDATE
    `;
    return rows.map(({ id }) => id);
  }

  async replacePricing(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    rules: readonly AdminPricingRuleData[],
  ): Promise<void> {
    await transaction.pricingRule.deleteMany({ where: { vehicleId } });
    await transaction.pricingRule.createMany({
      data: rules.map((rule) => ({ vehicleId, ...rule })),
    });
  }

  async replaceImages(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    images: readonly AdminVehicleImageData[],
  ): Promise<void> {
    await transaction.vehicleImage.deleteMany({ where: { vehicleId } });
    if (images.length > 0) {
      await transaction.vehicleImage.createMany({
        data: images.map((image) => ({ vehicleId, ...image })),
      });
    }
  }
}

export const adminVehicleRepository: AdminVehicleRepository =
  new PrismaAdminVehicleRepository();
