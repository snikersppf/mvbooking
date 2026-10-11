import {
  BookingStatus,
  type PrismaClient,
} from "@prisma/client";
import {
  catalogVehicleListSelect,
  publicVehicleWhere,
  type CatalogVehicleRecord,
  type PublicVehicleFilters,
} from "@/server/repositories/catalog";

export type AvailabilityInterval = Readonly<{
  startDate: Date;
  endDate: Date;
}>;

const OCCUPYING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
] as const;

export interface AvailabilityRepository {
  hasActiveOverlap(
    client: PrismaClient,
    vehicleId: string,
    interval: AvailabilityInterval,
  ): Promise<boolean>;
  findAvailableVehicles(
    client: PrismaClient,
    filters: PublicVehicleFilters,
    interval: AvailabilityInterval,
  ): Promise<CatalogVehicleRecord[]>;
}

export class PrismaAvailabilityRepository implements AvailabilityRepository {
  async hasActiveOverlap(
    client: PrismaClient,
    vehicleId: string,
    interval: AvailabilityInterval,
  ): Promise<boolean> {
    const count = await client.booking.count({
      where: {
        vehicleId,
        status: { in: [...OCCUPYING_STATUSES] },
        startDate: { lt: interval.endDate },
        endDate: { gt: interval.startDate },
      },
    });

    return count > 0;
  }

  findAvailableVehicles(
    client: PrismaClient,
    filters: PublicVehicleFilters,
    interval: AvailabilityInterval,
  ): Promise<CatalogVehicleRecord[]> {
    return client.vehicle.findMany({
      where: {
        ...publicVehicleWhere(filters),
        bookings: {
          none: {
            status: { in: [...OCCUPYING_STATUSES] },
            startDate: { lt: interval.endDate },
            endDate: { gt: interval.startDate },
          },
        },
      },
      select: catalogVehicleListSelect,
    });
  }
}

export const availabilityRepository: AvailabilityRepository =
  new PrismaAvailabilityRepository();
