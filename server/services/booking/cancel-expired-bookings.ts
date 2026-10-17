import {
  BookingStatus,
  NotificationType,
  type PrismaClient,
} from "@prisma/client";
import { PENDING_BOOKING_EXPIRATION_MS } from "@/server/config/booking";
import { getPrismaClient } from "@/server/db/prisma";
import { bookingEventRepository } from "@/server/repositories/booking-events";
import { bookingRepository } from "@/server/repositories/bookings";
import { lockUserById } from "@/server/repositories/users";
import { vehicleRepository } from "@/server/repositories/vehicles";
import { runBookingTransaction } from "@/server/services/booking/transaction";

const BATCH_SIZE = 100;

export async function cancelExpiredPendingBookings(
  prisma: PrismaClient = getPrismaClient(),
  now: Date = new Date(),
): Promise<number> {
  if (Number.isNaN(now.getTime())) throw new TypeError("Invalid expiration time.");
  const cutoff = new Date(now.getTime() - PENDING_BOOKING_EXPIRATION_MS);
  let cancelledCount = 0;

  for (;;) {
    const candidates = await prisma.booking.findMany({
      where: { status: BookingStatus.PENDING, createdAt: { lt: cutoff } },
      select: { id: true, userId: true, vehicleId: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: BATCH_SIZE,
    });
    if (candidates.length === 0) return cancelledCount;

    for (const candidate of candidates) {
      const cancelled = await runBookingTransaction(
        prisma,
        `cron:cancel-expired:${candidate.id}`,
        async (transaction) => {
          // Match the existing User -> Vehicle -> Booking lock order.
          const user = await lockUserById(transaction, candidate.userId);
          if (!user) return false;
          const vehicle = await vehicleRepository.lockById(
            transaction,
            candidate.vehicleId,
          );
          if (!vehicle) return false;
          const booking = await bookingRepository.lockById(
            transaction,
            candidate.id,
          );
          if (
            !booking ||
            booking.userId !== user.id ||
            booking.vehicleId !== vehicle.id ||
            booking.status !== BookingStatus.PENDING ||
            booking.createdAt >= cutoff
          ) return false;

          await bookingRepository.updateStatus(
            transaction,
            booking.id,
            BookingStatus.CANCELLED,
          );
          await bookingEventRepository.createAudit(transaction, {
            userId: booking.userId,
            action: "BOOKING_EXPIRED",
            bookingId: booking.id,
            metadata: { actor: "system", previousStatus: booking.status },
          });
          await bookingEventRepository.createNotification(transaction, {
            userId: booking.userId,
            bookingId: booking.id,
            type: NotificationType.BOOKING_CANCELLED,
            eventKey: `booking:${booking.id}:expired`,
            payload: {
              provider: "mock",
              bookingId: booking.id,
              status: BookingStatus.CANCELLED,
            },
          });
          return true;
        },
      );
      if (cancelled) cancelledCount += 1;
    }
  }
}
