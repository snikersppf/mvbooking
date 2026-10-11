import {
  BookingStatus,
  Prisma,
  type Booking,
} from "@prisma/client";

export type CreateBookingRecord = Prisma.BookingUncheckedCreateInput;

export interface BookingRepository {
  findById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<Booking | null>;
  lockById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<Booking | null>;
  findByIdempotencyKey(
    transaction: Prisma.TransactionClient,
    userId: string,
    idempotencyKey: string,
  ): Promise<Booking | null>;
  countPendingByUser(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<number>;
  lockActiveOverlaps(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string[]>;
  create(
    transaction: Prisma.TransactionClient,
    data: CreateBookingRecord,
  ): Promise<Booking>;
  updateStatus(
    transaction: Prisma.TransactionClient,
    id: string,
    status: BookingStatus,
    managerComment?: string | null,
  ): Promise<Booking>;
}

export class PrismaBookingRepository implements BookingRepository {
  async findById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<Booking | null> {
    return transaction.booking.findUnique({ where: { id } });
  }

  async lockById(
    transaction: Prisma.TransactionClient,
    id: string,
  ): Promise<Booking | null> {
    const rows = await transaction.$queryRaw<Booking[]>`
      SELECT
        "id", "userId", "vehicleId", "startDate", "endDate",
        "pickupLocation", "returnLocation", "totalDays", "pricePerDay",
        "totalAmount", "depositAmount", "currency", "status",
        "paymentStatus", "idempotencyKey", "requestHash",
        "customerComment", "managerComment", "createdAt", "updatedAt"
      FROM "Booking"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    return rows[0] ?? null;
  }

  async findByIdempotencyKey(
    transaction: Prisma.TransactionClient,
    userId: string,
    idempotencyKey: string,
  ): Promise<Booking | null> {
    return transaction.booking.findUnique({
      where: {
        userId_idempotencyKey: { userId, idempotencyKey },
      },
    });
  }

  async countPendingByUser(
    transaction: Prisma.TransactionClient,
    userId: string,
  ): Promise<number> {
    return transaction.booking.count({
      where: { userId, status: BookingStatus.PENDING },
    });
  }

  async lockActiveOverlaps(
    transaction: Prisma.TransactionClient,
    vehicleId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Booking"
      WHERE "vehicleId" = ${vehicleId}
        AND "status" IN ('PENDING', 'CONFIRMED')
        AND "startDate" < ${endDate}
        AND ${startDate} < "endDate"
      ORDER BY "id"
      FOR UPDATE
    `;

    return rows.map(({ id }) => id);
  }

  async create(
    transaction: Prisma.TransactionClient,
    data: CreateBookingRecord,
  ): Promise<Booking> {
    return transaction.booking.create({ data });
  }

  async updateStatus(
    transaction: Prisma.TransactionClient,
    id: string,
    status: BookingStatus,
    managerComment?: string | null,
  ): Promise<Booking> {
    return transaction.booking.update({
      where: { id },
      data: {
        status,
        ...(managerComment !== undefined ? { managerComment } : {}),
      },
    });
  }
}

export const bookingRepository: BookingRepository =
  new PrismaBookingRepository();
