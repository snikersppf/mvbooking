import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  customerBookingRepository,
  type CustomerBookingRepository,
} from "@/server/repositories/customer-bookings";
import {
  toCustomerBookingDto,
  type CustomerBookingDto,
} from "@/server/services/booking/customer-booking-dto";
import {
  bookingIdSchema,
  bookingListQuerySchema,
} from "@/server/validators/booking-api";

export type CustomerBookingPage = Readonly<{
  items: CustomerBookingDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}>;

export type CustomerBookingReadDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: CustomerBookingRepository;
}>;

export async function listCustomerBookings(
  userId: string,
  input: unknown,
  dependencies: CustomerBookingReadDependencies = {},
): Promise<CustomerBookingPage> {
  const query = bookingListQuerySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? customerBookingRepository;
  const offset = (query.page - 1) * query.pageSize;
  const [totalItems, bookings] = await Promise.all([
    repository.countByUser(prisma, userId),
    repository.findManyByUser(
      prisma,
      userId,
      offset,
      query.pageSize,
    ),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  return {
    items: bookings.map(toCustomerBookingDto),
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: query.page > 1,
    hasNextPage: query.page < totalPages,
  };
}

export async function getCustomerBooking(
  userId: string,
  input: unknown,
  dependencies: CustomerBookingReadDependencies = {},
): Promise<CustomerBookingDto | null> {
  const id = bookingIdSchema.parse(input);
  const booking = await (
    dependencies.repository ?? customerBookingRepository
  ).findByIdAndUser(
    dependencies.prisma ?? getPrismaClient(),
    id,
    userId,
  );

  return booking ? toCustomerBookingDto(booking) : null;
}
