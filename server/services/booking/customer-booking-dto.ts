import type { Booking } from "@prisma/client";
import type { CustomerBookingRecord } from "@/server/repositories/customer-bookings";

export type CustomerBookingSource = Pick<
  Booking,
  | "id"
  | "vehicleId"
  | "startDate"
  | "endDate"
  | "pickupLocation"
  | "returnLocation"
  | "totalDays"
  | "pricePerDay"
  | "totalAmount"
  | "depositAmount"
  | "currency"
  | "status"
  | "paymentStatus"
  | "customerComment"
  | "createdAt"
  | "updatedAt"
>;

export type CustomerBookingDto = Readonly<{
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalDays: number;
  pricePerDay: string;
  totalAmount: string;
  depositAmount: string;
  totalDue: string;
  currency: string;
  status: Booking["status"];
  paymentStatus: Booking["paymentStatus"];
  customerComment: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: Readonly<{
    slug: string;
    brand: string;
    model: string;
  }> | null;
}>;

export function toCustomerBookingDto(
  booking: CustomerBookingSource | CustomerBookingRecord,
): CustomerBookingDto {
  const vehicle =
    "vehicle" in booking
      ? {
          slug: booking.vehicle.slug,
          brand: booking.vehicle.brand,
          model: booking.vehicle.model,
        }
      : null;

  return {
    id: booking.id,
    vehicleId: booking.vehicleId,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    pickupLocation: booking.pickupLocation,
    returnLocation: booking.returnLocation,
    totalDays: booking.totalDays,
    pricePerDay: booking.pricePerDay.toFixed(2),
    totalAmount: booking.totalAmount.toFixed(2),
    depositAmount: booking.depositAmount.toFixed(2),
    totalDue: booking.totalAmount.plus(booking.depositAmount).toFixed(2),
    currency: booking.currency,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    customerComment: booking.customerComment,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    vehicle,
  };
}
