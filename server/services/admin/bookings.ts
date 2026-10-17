import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/server/db/prisma";
import {
  adminBookingRepository,
  type AdminBookingRepository,
} from "@/server/repositories/admin-bookings";
import type { AdminActorCommand } from "@/server/services/admin/authorization";
import {
  buildAdminPage,
  toAdminBookingDto,
  type AdminBookingDto,
  type AdminPage,
} from "@/server/services/admin/dto";
import { AdminServiceError } from "@/server/services/admin/errors";
import { changeBookingStatusByManager } from "@/server/services/booking/change-booking-status";
import {
  adminBookingListQuerySchema,
  adminBookingStatusSchema,
  adminEntityIdSchema,
} from "@/server/validators/admin";

export type AdminBookingDependencies = Readonly<{
  prisma?: PrismaClient;
  repository?: AdminBookingRepository;
  now?: () => Date;
  requestId?: () => string;
  transaction?: Prisma.TransactionClient;
}>;

export async function listAdminBookings(
  input: unknown,
  dependencies: AdminBookingDependencies = {},
): Promise<AdminPage<AdminBookingDto>> {
  const query = adminBookingListQuerySchema.parse(input);
  const prisma = dependencies.prisma ?? getPrismaClient();
  const repository = dependencies.repository ?? adminBookingRepository;
  const filters = {
    status: query.status,
    paymentStatus: query.paymentStatus,
    userId: query.userId,
    vehicleId: query.vehicleId,
  };
  const offset = (query.page - 1) * query.pageSize;
  const [totalItems, bookings] = await Promise.all([
    repository.count(prisma, filters),
    repository.findMany(prisma, filters, offset, query.pageSize),
  ]);
  return buildAdminPage(
    bookings.map(toAdminBookingDto),
    query.page,
    query.pageSize,
    totalItems,
  );
}

export async function getAdminBooking(
  idInput: unknown,
  dependencies: AdminBookingDependencies = {},
): Promise<AdminBookingDto | null> {
  const id = adminEntityIdSchema.parse(idInput);
  const booking = await (
    dependencies.repository ?? adminBookingRepository
  ).findById(dependencies.prisma ?? getPrismaClient(), id);
  return booking ? toAdminBookingDto(booking) : null;
}

export async function changeAdminBookingStatus(
  command: AdminActorCommand &
    Readonly<{ bookingId: unknown; change: unknown }>,
  dependencies: AdminBookingDependencies = {},
): Promise<AdminBookingDto> {
  const bookingId = adminEntityIdSchema.parse(command.bookingId);
  const change = adminBookingStatusSchema.parse(command.change);
  const requestId =
    command.requestId ?? dependencies.requestId?.() ?? randomUUID();
  const prisma = dependencies.prisma ?? getPrismaClient();

  await changeBookingStatusByManager(
    {
      actorUserId: command.actorUserId,
      expectedSessionVersion: command.expectedSessionVersion,
      bookingId,
      status: change.status,
      managerComment: change.managerComment,
      requestId,
    },
    { prisma, now: dependencies.now, transaction: dependencies.transaction },
  );

  const booking = await (
    dependencies.repository ?? adminBookingRepository
  ).findById(dependencies.transaction ?? prisma, bookingId);
  if (!booking) {
    throw new AdminServiceError(
      "ADMIN_RESOURCE_NOT_FOUND",
      404,
      "Booking was not found after status change.",
      requestId,
    );
  }
  return toAdminBookingDto(booking);
}
