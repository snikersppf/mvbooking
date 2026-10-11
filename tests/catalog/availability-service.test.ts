import { Prisma, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { CatalogVehicleRecord } from "@/server/repositories/catalog";
import { checkVehicleAvailability } from "@/server/services/availability/check-vehicle";
import { listAvailableVehicles } from "@/server/services/availability/list-available-vehicles";

function vehicle(id = "vehicle_1"): CatalogVehicleRecord {
  return {
    id,
    slug: `slug-${id}`,
    brand: "Toyota",
    model: "RAV4",
    year: 2025,
    category: "SUV",
    seats: 5,
    transmission: "AUTOMATIC",
    fuel: "HYBRID",
    drive: "AWD",
    depositAmount: new Prisma.Decimal("300"),
    currency: "GEL",
    insuranceIncluded: true,
    location: "Tbilisi",
    images: [],
    pricingRules: [
      { id: "p1", minDays: 1, maxDays: 2, pricePerDay: new Prisma.Decimal("100"), currency: "GEL" },
      { id: "p2", minDays: 3, maxDays: 6, pricePerDay: new Prisma.Decimal("90"), currency: "GEL" },
      { id: "p3", minDays: 7, maxDays: 14, pricePerDay: new Prisma.Decimal("80"), currency: "GEL" },
      { id: "p4", minDays: 15, maxDays: null, pricePerDay: new Prisma.Decimal("70"), currency: "GEL" },
    ],
  };
}

const period = {
  startDate: "2026-11-10T06:00:00Z",
  endDate: "2026-11-13T06:00:00Z",
};
const prismaStub = {} as PrismaClient;

describe("checkVehicleAvailability", () => {
  it("returns only availability and a quote, without booking details", async () => {
    const result = await checkVehicleAvailability(
      { vehicleId: "vehicle_1", ...period },
      {
        prisma: prismaStub,
        catalogRepository: {
          findPublicVehicleById: vi.fn().mockResolvedValue(vehicle()),
        },
        availabilityRepository: {
          hasActiveOverlap: vi.fn().mockResolvedValue(true),
        },
        now: () => new Date("2026-11-01T00:00:00Z"),
      },
    );

    expect(result).toEqual({
      vehicleId: "vehicle_1",
      startDate: "2026-11-10T06:00:00.000Z",
      endDate: "2026-11-13T06:00:00.000Z",
      available: false,
      quote: {
        totalDays: 3,
        pricePerDay: "90.00",
        totalAmount: "270.00",
        depositAmount: "300.00",
        totalDue: "570.00",
        currency: "GEL",
      },
    });
    expect(result).not.toHaveProperty("booking");
    expect(result).not.toHaveProperty("userId");
  });

  it("returns null for a vehicle hidden from the public catalog", async () => {
    await expect(
      checkVehicleAvailability(
        { vehicleId: "hidden", ...period },
        {
          prisma: prismaStub,
          catalogRepository: {
            findPublicVehicleById: vi.fn().mockResolvedValue(null),
          },
          availabilityRepository: { hasActiveOverlap: vi.fn() },
          now: () => new Date("2026-11-01T00:00:00Z"),
        },
      ),
    ).resolves.toBeNull();
  });
});

describe("listAvailableVehicles", () => {
  it("returns period pricing for records selected by the repository", async () => {
    const findAvailableVehicles = vi.fn().mockResolvedValue([vehicle()]);
    const result = await listAvailableVehicles(
      { ...period, pageSize: "10" },
      {
        prisma: prismaStub,
        repository: { findAvailableVehicles },
        now: () => new Date("2026-11-01T00:00:00Z"),
      },
    );

    expect(result.items[0]).toMatchObject({
      id: "vehicle_1",
      pricePerDay: "90.00",
      pricingPeriodDays: 3,
    });
    expect(findAvailableVehicles).toHaveBeenCalledWith(
      prismaStub,
      expect.any(Object),
      {
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate),
      },
    );
  });
});
