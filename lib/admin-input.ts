export const ADMIN_PAGE_SIZE = 20;
export const ADMIN_PAGE_SIZE_MAX = 50;

export const ADMIN_VEHICLE_CATEGORIES = [
  "ECONOMY",
  "COMPACT",
  "SUV",
  "VAN",
  "PREMIUM",
] as const;

export const ADMIN_TRANSMISSIONS = ["AUTOMATIC", "MANUAL"] as const;
export const ADMIN_FUELS = [
  "PETROL",
  "DIESEL",
  "HYBRID",
  "ELECTRIC",
] as const;
export const ADMIN_DRIVES = ["FWD", "RWD", "AWD", "4WD"] as const;
export const ADMIN_EDITABLE_VEHICLE_STATUSES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "MAINTENANCE",
] as const;
export const ADMIN_VEHICLE_STATUSES = [
  ...ADMIN_EDITABLE_VEHICLE_STATUSES,
  "ARCHIVED",
] as const;
export const ADMIN_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "REJECTED",
] as const;
export const ADMIN_PAYMENT_STATUSES = [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const;
export const ADMIN_USER_ROLES = ["CUSTOMER", "MANAGER", "ADMIN"] as const;
export const ADMIN_USER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
] as const;

export const ADMIN_INPUT_LIMITS = {
  slug: 120,
  vehicleText: 120,
  description: 5_000,
  location: 160,
  managerComment: 2_000,
  imageUrl: 2_048,
  imageAlt: 300,
  images: 30,
  pricingRules: 20,
} as const;

