import {
  Prisma,
  type BookingStatus,
  type PaymentStatus,
  type PrismaClient,
} from "@prisma/client";

type ReadClient = PrismaClient | Prisma.TransactionClient;

export const adminBookingSelect = {
  id: true,
  userId: true,
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
  managerComment: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      slug: true,
      brand: true,
      model: true,
      status: true,
    },
  },
} satisfies Prisma.BookingSelect;

export type AdminBookingRecord = Prisma.BookingGetPayload<{
  select: typeof adminBookingSelect;
}>;

export type AdminBookingFilters = Readonly<{
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  userId?: string;
  vehicleId?: string;
}>;

export interface AdminBookingRepository {
  count(client: ReadClient, filters: AdminBookingFilters): Promise<number>;
  findMany(
    client: ReadClient,
    filters: AdminBookingFilters,
    offset: number,
    limit: number,
  ): Promise<AdminBookingRecord[]>;
  findById(client: ReadClient, id: string): Promise<AdminBookingRecord | null>;
}

function bookingWhere(filters: AdminBookingFilters): Prisma.BookingWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
  };
}

export class PrismaAdminBookingRepository
  implements AdminBookingRepository
{
  count(client: ReadClient, filters: AdminBookingFilters): Promise<number> {
    return client.booking.count({ where: bookingWhere(filters) });
  }

  findMany(
    client: ReadClient,
    filters: AdminBookingFilters,
    offset: number,
    limit: number,
  ): Promise<AdminBookingRecord[]> {
    return client.booking.findMany({
      where: bookingWhere(filters),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: offset,
      take: limit,
      select: adminBookingSelect,
    });
  }

  findById(
    client: ReadClient,
    id: string,
  ): Promise<AdminBookingRecord | null> {
    return client.booking.findUnique({
      where: { id },
      select: adminBookingSelect,
    });
  }
}

export const adminBookingRepository: AdminBookingRepository =
  new PrismaAdminBookingRepository();
