import { Prisma, type Vehicle } from "@prisma/client";

export type LockedVehicle = Pick<
  Vehicle,
  "id" | "status" | "depositAmount" | "currency"
>;

export interface VehicleRepository {
  lockById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<LockedVehicle | null>;
}

export class PrismaVehicleRepository implements VehicleRepository {
  async lockById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<LockedVehicle | null> {
    const rows = await transaction.$queryRaw<LockedVehicle[]>`
      SELECT "id", "status", "depositAmount", "currency"
      FROM "Vehicle"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    return rows[0] ?? null;
  }
}

export const vehicleRepository: VehicleRepository =
  new PrismaVehicleRepository();
