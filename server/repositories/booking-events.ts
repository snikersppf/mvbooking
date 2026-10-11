import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
  type AuditLog,
  type Notification,
} from "@prisma/client";

export type CreateBookingAuditInput = Readonly<{
  userId: string;
  action: string;
  bookingId: string;
  metadata?: Prisma.InputJsonValue;
}>;

export type CreateBookingNotificationInput = Readonly<{
  userId: string;
  bookingId: string;
  type: NotificationType;
  eventKey: string;
  payload: Prisma.InputJsonValue;
}>;

export interface BookingEventRepository {
  createAudit(
    transaction: Prisma.TransactionClient,
    input: CreateBookingAuditInput,
  ): Promise<AuditLog>;
  createNotification(
    transaction: Prisma.TransactionClient,
    input: CreateBookingNotificationInput,
  ): Promise<Notification>;
}

export class PrismaBookingEventRepository implements BookingEventRepository {
  async createAudit(
    transaction: Prisma.TransactionClient,
    input: CreateBookingAuditInput,
  ): Promise<AuditLog> {
    return transaction.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: "Booking",
        entityId: input.bookingId,
        metadata: input.metadata,
      },
    });
  }

  async createNotification(
    transaction: Prisma.TransactionClient,
    input: CreateBookingNotificationInput,
  ): Promise<Notification> {
    return transaction.notification.create({
      data: {
        userId: input.userId,
        bookingId: input.bookingId,
        channel: NotificationChannel.EMAIL,
        type: input.type,
        status: NotificationStatus.PENDING,
        eventKey: input.eventKey,
        payload: input.payload,
      },
    });
  }
}

export const bookingEventRepository: BookingEventRepository =
  new PrismaBookingEventRepository();
