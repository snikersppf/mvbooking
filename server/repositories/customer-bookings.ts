import { Prisma, type PrismaClient } from "@prisma/client";

export const customerBookingSelect = {
  id: true,
  vehicleId: true,
  startDate: true,
  endDate: true,
  pickupLocation: true,
  returnLocation: true,
  totalDays: true,
  pricePerDay: true,
  totalAmount: true,
  depositAmount: true,
  currency: true,
  status: true,
  paymentStatus: true,
  customerComment: true,
  createdAt: true,
  updatedAt: true,
  vehicle: {
    select: {
      slug: true,
      brand: true,
      model: true,
    },
  },
} satisfies Prisma.BookingSelect;

export type CustomerBookingRecord = Prisma.BookingGetPayload<{
  select: typeof customerBookingSelect;
}>;

export interface CustomerBookingRepository {
  countByUser(client: PrismaClient, userId: string): Promise<number>;
  findManyByUser(
    client: PrismaClient,
    userId: string,
    offset: number,
    limit: number,
  ): Promise<CustomerBookingRecord[]>;
  findByIdAndUser(
    client: PrismaClient,
    id: string,
    userId: string,
  ): Promise<CustomerBookingRecord | null>;
}

export class PrismaCustomerBookingRepository
  implements CustomerBookingRepository
{
  countByUser(client: PrismaClient, userId: string): Promise<number> {
    return client.booking.count({ where: { userId } });
  }

  findManyByUser(
    client: PrismaClient,
    userId: string,
    offset: number,
    limit: number,
  ): Promise<CustomerBookingRecord[]> {
    return client.booking.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: customerBookingSelect,
    });
  }

  findByIdAndUser(
    client: PrismaClient,
    id: string,
    userId: string,
  ): Promise<CustomerBookingRecord | null> {
    return client.booking.findFirst({
      where: { id, userId },
      select: customerBookingSelect,
    });
  }
}

export const customerBookingRepository: CustomerBookingRepository =
  new PrismaCustomerBookingRepository();
