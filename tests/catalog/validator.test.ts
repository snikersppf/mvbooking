import { describe, expect, it } from "vitest";
import {
  availableVehicleListQuerySchema,
  catalogQuerySchema,
  vehicleAvailabilityQuerySchema,
} from "@/server/validators/catalog";

describe("catalogQuerySchema", () => {
  it("parses all filters, sorting, dates and pagination", () => {
    const result = catalogQuerySchema.parse({
      category: "SUV",
      minPrice: "70.50",
      maxPrice: "120",
      seats: "5",
      transmission: "AUTOMATIC",
      fuel: "HYBRID",
      drive: "AWD",
      sort: "year_desc",
      page: "2",
      pageSize: "50",
      startDate: "2026-11-10T10:00:00+04:00",
      endDate: "2026-11-13T10:00:00+04:00",
    });

    expect(result).toMatchObject({
      category: "SUV",
      minPrice: 70.5,
      maxPrice: 120,
      seats: 5,
      sort: "year_desc",
      page: 2,
      pageSize: 50,
      startDate: new Date("2026-11-10T06:00:00.000Z"),
      endDate: new Date("2026-11-13T06:00:00.000Z"),
    });
  });

  it("applies defaults and treats empty optional fields as absent", () => {
    expect(
      catalogQuerySchema.parse({ category: "", minPrice: "" }),
    ).toEqual({ sort: "price_asc", page: 1, pageSize: 12 });
  });

  it("rejects extra fields, oversized pages and an inverted price range", () => {
    expect(catalogQuerySchema.safeParse({ status: "ARCHIVED" }).success).toBe(
      false,
    );
    expect(catalogQuerySchema.safeParse({ pageSize: "51" }).success).toBe(
      false,
    );
    expect(
      catalogQuerySchema.safeParse({ minPrice: "101", maxPrice: "100" })
        .success,
    ).toBe(false);
  });

  it("requires both dates with explicit offsets", () => {
    expect(
      catalogQuerySchema.safeParse({
        startDate: "2026-11-10T10:00:00+04:00",
      }).success,
    ).toBe(false);
    expect(
      catalogQuerySchema.safeParse({
        startDate: "2026-11-10T10:00:00",
        endDate: "2026-11-11T10:00:00",
      }).success,
    ).toBe(false);
  });
});

describe("availability query schemas", () => {
  it("requires a period for list and single-vehicle checks", () => {
    const period = {
      startDate: "2026-11-10T06:00:00Z",
      endDate: "2026-11-11T06:00:00Z",
    };

    expect(availableVehicleListQuerySchema.safeParse(period).success).toBe(
      true,
    );
    expect(
      vehicleAvailabilityQuerySchema.safeParse({
        vehicleId: "vehicle_1",
        ...period,
      }).success,
    ).toBe(true);
    expect(vehicleAvailabilityQuerySchema.safeParse(period).success).toBe(
      false,
    );
  });
});
