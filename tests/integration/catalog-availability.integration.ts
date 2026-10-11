import { randomUUID } from "node:crypto";
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  UserStatus,
  VehicleStatus,
} from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/server/db/prisma";
import { checkVehicleAvailability } from "@/server/services/availability/check-vehicle";
import { listAvailableVehicles } from "@/server/services/availability/list-available-vehicles";
import { createBooking } from "@/server/services/booking/create-booking";
import { getCatalogVehicleBySlug } from "@/server/services/catalog/get-vehicle";
import { listCatalogVehicles } from "@/server/services/catalog/list-vehicles";
import { requireTestDatabaseUrl } from "@/tests/integration/test-database";

const DAY_MS = 24 * 60 * 60 * 1_000;
const prisma = createPrismaClient(requireTestDatabaseUrl());
let prefixes: string[] = [];

function newPrefix(): string {
  const prefix = `cat_${randomUUID().replaceAll("-", "").slice(0, 14)}`;
  prefixes.push(prefix);
  return prefix;
}

function futureInterval(
  offsetDays: number,
  durationDays = 1,
): { startDate: Date; endDate: Date } {
  const startDate = new Date(Date.now() + offsetDays * DAY_MS);
  startDate.setUTCMilliseconds(0);
  return {
    startDate,
    endDate: new Date(startDate.getTime() + durationDays * DAY_MS),
  };
}

async function createUser(prefix: string, label: string) {
  return prisma.user.create({
    data: {
      id: `${prefix}_user_${label}`,
      name: `Catalog ${label}`,
      email: `${prefix}_${label}@example.test`,
      status: UserStatus.ACTIVE,
      sessionVersion: 0,
    },
  });
}

type VehicleOptions = Readonly<{
  status?: VehicleStatus;
  brand?: string;
  year?: number;
  category?: string;
  seats?: number;
  transmission?: string;
  fuel?: string;
  drive?: string;
  prices?: readonly [string, string, string, string];
}>;

async function createVehicle(
  prefix: string,
  label: string,
  options: VehicleOptions = {},
) {
  const id = `${prefix}_vehicle_${label}`;
  const prices = options.prices ?? ["100", "90", "80", "70"];
  const vehicle = await prisma.vehicle.create({
    data: {
      id,
      slug: `${prefix}-${label}`,
      brand: options.brand ?? "Toyota",
      model: `Model ${label}`,
      year: options.year ?? 2024,
      category: options.category ?? "SUV",
      seats: options.seats ?? 5,
      transmission: options.transmission ?? "AUTOMATIC",
      fuel: options.fuel ?? "PETROL",
      drive: options.drive ?? "AWD",
      depositAmount: new Prisma.Decimal("300.00"),
      currency: "GEL",
      insuranceIncluded: true,
      status: options.status ?? VehicleStatus.AVAILABLE,
      location: "Tbilisi",
    },
  });

  await prisma.pricingRule.createMany({
    data: [
      { id: `${id}_p1`, vehicleId: id, minDays: 1, maxDays: 2, pricePerDay: new Prisma.Decimal(prices[0]), currency: "GEL" },
      { id: `${id}_p2`, vehicleId: id, minDays: 3, maxDays: 6, pricePerDay: new Prisma.Decimal(prices[1]), currency: "GEL" },
      { id: `${id}_p3`, vehicleId: id, minDays: 7, maxDays: 14, pricePerDay: new Prisma.Decimal(prices[2]), currency: "GEL" },
      { id: `${id}_p4`, vehicleId: id, minDays: 15, maxDays: null, pricePerDay: new Prisma.Decimal(prices[3]), currency: "GEL" },
    ],
  });

  return vehicle;
}

async function createStoredBooking(
  userId: string,
  vehicleId: string,
  interval: { startDate: Date; endDate: Date },
  status: BookingStatus,
) {
  return prisma.booking.create({
    data: {
      userId,
      vehicleId,
      startDate: interval.startDate,
      endDate: interval.endDate,
      pickupLocation: "Tbilisi",
      returnLocation: "Tbilisi",
      totalDays: 1,
      pricePerDay: new Prisma.Decimal("100.00"),
      totalAmount: new Prisma.Decimal("100.00"),
      depositAmount: new Prisma.Decimal("300.00"),
      currency: "GEL",
      status,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });
}

async function cleanup(prefix: string): Promise<void> {
  await prisma.notification.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.auditLog.deleteMany({
    where: { userId: { startsWith: prefix } },
  });
  await prisma.booking.deleteMany({
    where: {
      OR: [
        { userId: { startsWith: prefix } },
        { vehicleId: { startsWith: prefix } },
      ],
    },
  });
  await prisma.vehicleImage.deleteMany({
    where: { vehicleId: { startsWith: prefix } },
  });
  await prisma.pricingRule.deleteMany({
    where: { vehicleId: { startsWith: prefix } },
  });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  for (const prefix of prefixes.reverse()) await cleanup(prefix);
  prefixes = [];
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("catalog and availability integration", () => {
  it("filters public vehicles and hides every non-AVAILABLE status", async () => {
    const prefix = newPrefix();
    const scopedCategory = `${prefix}_CATEGORY`;
    const suv = await createVehicle(prefix, "suv", {
      category: scopedCategory,
      fuel: "HYBRID",
      prices: ["110", "95", "80", "70"],
    });
    const van = await createVehicle(prefix, "van", {
      brand: "Ford",
      category: scopedCategory,
      seats: 9,
      transmission: "MANUAL",
      fuel: "DIESEL",
      drive: "RWD",
      prices: ["90", "75", "60", "50"],
    });
    await createVehicle(prefix, "archived", {
      status: VehicleStatus.ARCHIVED,
      category: scopedCategory,
      prices: ["10", "10", "10", "10"],
    });
    await createVehicle(prefix, "maintenance", {
      status: VehicleStatus.MAINTENANCE,
      category: scopedCategory,
      prices: ["20", "20", "20", "20"],
    });
    await createVehicle(prefix, "unavailable", {
      status: VehicleStatus.UNAVAILABLE,
      category: scopedCategory,
      prices: ["30", "30", "30", "30"],
    });

    const all = await listCatalogVehicles(
      { category: scopedCategory, pageSize: 50 },
      { prisma },
    );
    expect(all.items.map(({ id }) => id).sort()).toEqual(
      [suv.id, van.id].sort(),
    );
    await expect(
      listCatalogVehicles(
        {
          category: scopedCategory,
          seats: 8,
          transmission: "MANUAL",
          fuel: "DIESEL",
          drive: "RWD",
          minPrice: 45,
          maxPrice: 55,
        },
        { prisma },
      ),
    ).resolves.toMatchObject({
      totalItems: 1,
      items: [expect.objectContaining({ id: van.id, pricePerDay: "50.00" })],
    });
    await expect(
      getCatalogVehicleBySlug(`${prefix}-archived`, { prisma }),
    ).resolves.toBeNull();
  });

  it("sorts with an id tie-breaker and paginates after pricing", async () => {
    const prefix = newPrefix();
    const scopedCategory = `${prefix}_SORT`;
    const second = await createVehicle(prefix, "b", {
      brand: "Beta",
      year: 2025,
      category: scopedCategory,
      prices: ["80", "70", "60", "50"],
    });
    const first = await createVehicle(prefix, "a", {
      brand: "Alpha",
      year: 2020,
      category: scopedCategory,
      prices: ["80", "70", "60", "50"],
    });
    const expensive = await createVehicle(prefix, "c", {
      brand: "Gamma",
      year: 2023,
      category: scopedCategory,
      prices: ["100", "90", "80", "70"],
    });

    const firstPage = await listCatalogVehicles(
      { category: scopedCategory, sort: "price_asc", pageSize: 2 },
      { prisma },
    );
    const secondPage = await listCatalogVehicles(
      {
        category: scopedCategory,
        sort: "price_asc",
        page: 2,
        pageSize: 2,
      },
      { prisma },
    );
    const brandDescending = await listCatalogVehicles(
      { category: scopedCategory, sort: "brand_desc", pageSize: 50 },
      { prisma },
    );

    expect(firstPage.items.map(({ id }) => id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(secondPage.items.map(({ id }) => id)).toEqual([expensive.id]);
    expect(brandDescending.items.map(({ brand }) => brand)).toEqual([
      "Gamma",
      "Beta",
      "Alpha",
    ]);
  });

  it("uses half-open boundaries and returns only free vehicles", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "customer");
    const occupied = await createVehicle(prefix, "occupied");
    const confirmed = await createVehicle(prefix, "confirmed");
    const free = await createVehicle(prefix, "free");
    const interval = futureInterval(150, 1);
    await createStoredBooking(
      user.id,
      occupied.id,
      interval,
      BookingStatus.PENDING,
    );
    await createStoredBooking(
      user.id,
      confirmed.id,
      interval,
      BookingStatus.CONFIRMED,
    );

    const endingAtStart = await checkVehicleAvailability(
      {
        vehicleId: occupied.id,
        startDate: new Date(interval.startDate.getTime() - DAY_MS).toISOString(),
        endDate: interval.startDate.toISOString(),
      },
      { prisma },
    );
    const startingAtEnd = await checkVehicleAvailability(
      {
        vehicleId: occupied.id,
        startDate: interval.endDate.toISOString(),
        endDate: new Date(interval.endDate.getTime() + DAY_MS).toISOString(),
      },
      { prisma },
    );
    const overlapping = await checkVehicleAvailability(
      {
        vehicleId: occupied.id,
        startDate: interval.startDate.toISOString(),
        endDate: interval.endDate.toISOString(),
      },
      { prisma },
    );
    const confirmedOverlap = await checkVehicleAvailability(
      {
        vehicleId: confirmed.id,
        startDate: interval.startDate.toISOString(),
        endDate: interval.endDate.toISOString(),
      },
      { prisma },
    );
    const available = await listAvailableVehicles(
      {
        startDate: interval.startDate.toISOString(),
        endDate: interval.endDate.toISOString(),
        pageSize: 50,
      },
      { prisma },
    );

    expect(endingAtStart?.available).toBe(true);
    expect(startingAtEnd?.available).toBe(true);
    expect(overlapping).toMatchObject({
      vehicleId: occupied.id,
      available: false,
    });
    expect(overlapping).not.toHaveProperty("booking");
    expect(overlapping).not.toHaveProperty("userId");
    expect(confirmedOverlap?.available).toBe(false);
    expect(available.items.map(({ id }) => id)).toContain(free.id);
    expect(available.items.map(({ id }) => id)).not.toContain(occupied.id);
    expect(available.items.map(({ id }) => id)).not.toContain(confirmed.id);
  });

  it("returns the same quote as the committed booking snapshot", async () => {
    const prefix = newPrefix();
    const user = await createUser(prefix, "quote");
    const vehicle = await createVehicle(prefix, "quote");
    const interval = futureInterval(180, 3);
    const availability = await checkVehicleAvailability(
      {
        vehicleId: vehicle.id,
        startDate: interval.startDate.toISOString(),
        endDate: interval.endDate.toISOString(),
      },
      { prisma },
    );
    const created = await createBooking(
      {
        userId: user.id,
        expectedSessionVersion: 0,
        booking: {
          vehicleId: vehicle.id,
          startDate: interval.startDate.toISOString(),
          endDate: interval.endDate.toISOString(),
          pickupLocation: "Tbilisi",
          returnLocation: "Tbilisi",
        },
      },
      { prisma },
    );

    expect(availability).toMatchObject({ available: true });
    expect(availability?.quote).toEqual({
      totalDays: created.booking.totalDays,
      pricePerDay: created.booking.pricePerDay.toFixed(2),
      totalAmount: created.booking.totalAmount.toFixed(2),
      depositAmount: created.booking.depositAmount.toFixed(2),
      totalDue: created.totalDue.toFixed(2),
      currency: created.booking.currency,
    });
  });
});
