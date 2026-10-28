import { Prisma, VehicleStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { checkProductionData, inspectProductionVehicle, productionImageOrigin, type ProductionVehicleRecord } from "@/server/services/maintenance/production-data";

const imageOrigin = "https://photos.owner.ge";
const vehicle: ProductionVehicleRecord = {
  id: "vehicle-1", slug: "vehicle-1", brand: "Brand", model: "Model", year: 2025,
  category: "SUV", description: null, seats: 5, transmission: "AUTOMATIC",
  fuel: "PETROL", drive: "AWD", engine: null, depositAmount: new Prisma.Decimal("300"),
  currency: "GEL", insuranceIncluded: false, status: VehicleStatus.AVAILABLE, location: "Tbilisi",
  images: [{ url: `${imageOrigin}/car.webp` }],
  pricingRules: [
    { minDays: 1, maxDays: 2, pricePerDay: new Prisma.Decimal("100"), currency: "GEL" },
    { minDays: 3, maxDays: 6, pricePerDay: new Prisma.Decimal("90"), currency: "GEL" },
    { minDays: 7, maxDays: 14, pricePerDay: new Prisma.Decimal("80"), currency: "GEL" },
    { minDays: 15, maxDays: null, pricePerDay: new Prisma.Decimal("70"), currency: "GEL" },
  ],
};

describe("production data readiness", () => {
  it("checks every bookable duration against the existing calculator", () => {
    expect(inspectProductionVehicle(vehicle, imageOrigin)).toEqual([]);
    expect(inspectProductionVehicle({ ...vehicle, pricingRules: vehicle.pricingRules.slice(1) }, imageOrigin))
      .toEqual(expect.arrayContaining([{ code: "UNBOOKABLE_TARIFF", vehicleId: vehicle.id }]));
  });
  it("reports missing images, demo records and incomplete draft vehicles correctly", () => {
    expect(inspectProductionVehicle({ ...vehicle, images: [] }, imageOrigin))
      .toContainEqual({ code: "NO_VEHICLE_IMAGES", vehicleId: vehicle.id });
    expect(inspectProductionVehicle({ ...vehicle, id: "seed-vehicle", status: VehicleStatus.UNAVAILABLE, images: [], pricingRules: [] }, imageOrigin))
      .toEqual([{ code: "TEST_VEHICLE", vehicleId: "seed-vehicle" }]);
  });
  it.each(["/design/car.jpg", "http://photos.owner.ge/car.jpg", "https://unowned.ge/car.jpg", `${imageOrigin}/car.jpg?token=secret`])(
    "flags unmanaged or temporary image URLs without outputting them: %s", (url) => {
      const result = inspectProductionVehicle({ ...vehicle, images: [{ url }] }, imageOrigin);
      expect(result).toContainEqual({ code: "IMAGE_NOT_ON_OWNED_PERMANENT_HTTPS_ORIGIN", vehicleId: vehicle.id });
      expect(JSON.stringify(result)).not.toContain(url);
    },
  );
  it.each([undefined, "http://photos.owner.ge", "https://localhost", "https://127.0.0.1", "https://example.com", "https://photos.owner.ge/path"])(
    "rejects non-production origin %s", (origin) => expect(() => productionImageOrigin(origin)).toThrow(),
  );
  it("accepts an owned HTTPS origin", () => expect(productionImageOrigin(imageOrigin)).toBe(imageOrigin));
  it("runs read-only queries and reports an empty catalogue and test accounts without PII", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(1);
    const client = { vehicle: { findMany }, user: { count } } as unknown as Parameters<typeof checkProductionData>[0];
    expect(await checkProductionData(client, imageOrigin)).toEqual({
      ok: false, vehicleCount: 0, availableVehicleCount: 0, testUserCount: 1,
      issues: [{ code: "NO_AVAILABLE_VEHICLES" }, { code: "TEST_USERS_PRESENT" }],
    });
  });
});
