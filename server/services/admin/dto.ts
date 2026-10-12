import type {
  BookingStatus,
  PaymentStatus,
  UserRole,
  UserStatus,
  VehicleStatus,
} from "@prisma/client";
import type { AdminBookingRecord } from "@/server/repositories/admin-bookings";
import type { AdminUserRecord } from "@/server/repositories/admin-users";
import type { AdminVehicleRecord } from "@/server/repositories/admin-vehicles";
import type { AdminAuditLogRecord } from "@/server/repositories/audit-logs";

export type AdminPage<T> = Readonly<{
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}>;

export function buildAdminPage<T>(
  items: T[],
  page: number,
  pageSize: number,
  totalItems: number,
): AdminPage<T> {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export type AdminVehicleDto = Readonly<{
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  description: string | null;
  seats: number;
  transmission: string;
  fuel: string;
  drive: string;
  engine: string | null;
  depositAmount: string;
  currency: string;
  insuranceIncluded: boolean;
  status: VehicleStatus;
  location: string;
  createdAt: string;
  updatedAt: string;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    sortOrder: number;
  }>;
  pricingRules: Array<{
    id: string;
    minDays: number;
    maxDays: number | null;
    pricePerDay: string;
    currency: string;
  }>;
}>;

export function toAdminVehicleDto(
  vehicle: AdminVehicleRecord,
): AdminVehicleDto {
  return {
    ...vehicle,
    depositAmount: vehicle.depositAmount.toFixed(2),
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
    images: vehicle.images.map((image) => ({ ...image })),
    pricingRules: vehicle.pricingRules.map((rule) => ({
      ...rule,
      pricePerDay: rule.pricePerDay.toFixed(2),
    })),
  };
}

export type AdminBookingDto = Readonly<{
  id: string;
  userId: string;
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
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  customerComment: string | null;
  managerComment: string | null;
  createdAt: string;
  updatedAt: string;
  user: AdminBookingRecord["user"];
  vehicle: AdminBookingRecord["vehicle"];
}>;

export function toAdminBookingDto(
  booking: AdminBookingRecord,
): AdminBookingDto {
  return {
    ...booking,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    pricePerDay: booking.pricePerDay.toFixed(2),
    totalAmount: booking.totalAmount.toFixed(2),
    depositAmount: booking.depositAmount.toFixed(2),
    totalDue: booking.totalAmount.plus(booking.depositAmount).toFixed(2),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export type AdminUserDto = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
}>;

export function toAdminUserDto(user: AdminUserRecord): AdminUserDto {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export type AdminAuditLogDto = Readonly<{
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: AdminAuditLogRecord["metadata"];
  createdAt: string;
  user: AdminAuditLogRecord["user"];
}>;

export function toAdminAuditLogDto(
  auditLog: AdminAuditLogRecord,
): AdminAuditLogDto {
  return {
    ...auditLog,
    createdAt: auditLog.createdAt.toISOString(),
  };
}
