import { isIP } from "node:net";
import { Prisma, VehicleStatus, type PrismaClient } from "@prisma/client";
import { isVehicleImageUrl } from "@/lib/vehicle-image-url";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { calculateBookingMoney } from "@/server/services/booking/money";
import { selectPricingTier } from "@/server/services/booking/pricing";
import { adminPricingReplaceSchema, adminVehicleCreateSchema } from "@/server/validators/admin";

export type ProductionDataIssue = Readonly<{ code: string; vehicleId?: string }>;

const vehicleSelect = {
  id: true, slug: true, brand: true, model: true, year: true,
  category: true, description: true, seats: true, transmission: true,
  fuel: true, drive: true, engine: true, depositAmount: true,
  currency: true, insuranceIncluded: true, status: true, location: true,
  images: { select: { url: true } },
  pricingRules: {
    select: { minDays: true, maxDays: true, pricePerDay: true, currency: true },
  },
} satisfies Prisma.VehicleSelect;

export type ProductionVehicleRecord = Prisma.VehicleGetPayload<{ select: typeof vehicleSelect }>;

/** An operator-supplied owned CDN origin; no DNS lookup or network request. */
export function productionImageOrigin(value: string | undefined): string {
  if (!value) throw new Error("VEHICLE_IMAGE_ORIGIN is required for the production data check.");
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (
    !isVehicleImageUrl(value) || url.protocol !== "https:" ||
    url.pathname !== "/" || url.search || url.hash || url.port ||
    !host.includes(".") || isIP(host) || host.startsWith("[") ||
    /(^|\.)(localhost|local|test|invalid|example)$/u.test(host) ||
    /(^|\.)example\.(com|org|net)$/u.test(host)
  ) {
    throw new Error("VEHICLE_IMAGE_ORIGIN must be an owned public HTTPS origin without a path.");
  }
  return url.origin;
}

export function inspectProductionVehicle(
  vehicle: ProductionVehicleRecord,
  imageOrigin: string,
): ProductionDataIssue[] {
  const issues: ProductionDataIssue[] = [];
  const add = (code: string) => issues.push({ code, vehicleId: vehicle.id });
  if (/^(seed-|e2e-|test-)/u.test(vehicle.id) || /^(seed-|e2e-|test-)/u.test(vehicle.slug)) {
    add("TEST_VEHICLE");
  }
  if (vehicle.status !== VehicleStatus.AVAILABLE) return issues;

  const { id: _id, images, pricingRules, ...fields } = vehicle;
  if (!adminVehicleCreateSchema.safeParse({
    ...fields, depositAmount: vehicle.depositAmount.toFixed(2),
  }).success) add("INVALID_VEHICLE_FIELDS");

  if (!adminPricingReplaceSchema.safeParse({
    rules: pricingRules.map((rule) => ({ ...rule, pricePerDay: rule.pricePerDay.toFixed(2) })),
  }).success) add("INVALID_TARIFF_COVERAGE");

  // Exercise the actual booking calculator for every supported rental duration.
  try {
    for (let days = 1; days <= BOOKING_CONFIG.maxDurationDays; days += 1) {
      const tier = selectPricingTier(days, pricingRules);
      const money = calculateBookingMoney({
        pricePerDay: tier.pricePerDay, totalDays: days, depositAmount: vehicle.depositAmount,
      });
      if (vehicle.currency !== "GEL" || tier.currency !== vehicle.currency ||
          money.totalAmount.greaterThan("9999999999.99")) {
        throw new Error("Booking amount cannot be persisted.");
      }
    }
  } catch {
    add("UNBOOKABLE_TARIFF");
  }

  if (images.length === 0) add("NO_VEHICLE_IMAGES");
  if (images.some(({ url }) => {
    if (!isVehicleImageUrl(url)) return true;
    try {
      const parsed = new URL(url);
      // Expiring signed URLs must not be persisted as public catalogue images.
      return parsed.origin !== imageOrigin || Boolean(parsed.search || parsed.hash);
    } catch {
      return true;
    }
  })) add("IMAGE_NOT_ON_OWNED_PERMANENT_HTTPS_ORIGIN");
  return issues;
}

export async function checkProductionData(client: PrismaClient, imageOrigin: string) {
  const issues: ProductionDataIssue[] = [];
  let vehicleCount = 0;
  let availableVehicleCount = 0;
  let cursor: string | undefined;
  for (;;) {
    const vehicles = await client.vehicle.findMany({
      select: vehicleSelect, take: 100, orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const vehicle of vehicles) {
      vehicleCount += 1;
      if (vehicle.status === VehicleStatus.AVAILABLE) availableVehicleCount += 1;
      issues.push(...inspectProductionVehicle(vehicle, imageOrigin));
    }
    if (vehicles.length < 100) break;
    cursor = vehicles[vehicles.length - 1].id;
  }
  if (availableVehicleCount === 0) issues.push({ code: "NO_AVAILABLE_VEHICLES" });
  const testUserCount = await client.user.count({
    where: { OR: [
      { id: { startsWith: "seed-" } }, { id: { startsWith: "e2e-" } },
      { email: { endsWith: "@example.com" } }, { email: { endsWith: ".test" } },
      { email: { endsWith: ".invalid" } },
    ] },
  });
  if (testUserCount > 0) issues.push({ code: "TEST_USERS_PRESENT" });
  return { ok: issues.length === 0, vehicleCount, availableVehicleCount, testUserCount, issues };
}
