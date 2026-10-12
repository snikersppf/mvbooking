import { describe, expect, it } from "vitest";
import {
  adminBookingStatusSchema,
  adminImagesReplaceSchema,
  adminPricingReplaceSchema,
  adminUserListQuerySchema,
  adminUserRoleSchema,
  adminVehicleCreateSchema,
  adminVehicleListQuerySchema,
  adminVehiclePatchSchema,
} from "@/server/validators/admin";

const vehicleInput = {
  slug: "toyota-rav4",
  brand: "Toyota",
  model: "RAV4",
  year: 2025,
  category: "SUV",
  seats: 5,
  transmission: "AUTOMATIC",
  fuel: "HYBRID",
  drive: "AWD",
  depositAmount: "300.00",
  location: "Tbilisi",
} as const;

const pricing = {
  rules: [
    { minDays: 1, maxDays: 2, pricePerDay: "100.00" },
    { minDays: 3, maxDays: 6, pricePerDay: "90.00" },
    { minDays: 7, maxDays: 14, pricePerDay: "80.00" },
    { minDays: 15, maxDays: null, pricePerDay: "70.00" },
  ],
};

describe("admin request validators", () => {
  it("applies safe vehicle defaults and rejects mass assignment", () => {
    expect(adminVehicleCreateSchema.parse(vehicleInput)).toMatchObject({
      ...vehicleInput,
      description: null,
      engine: null,
      currency: "GEL",
      insuranceIncluded: false,
      status: "AVAILABLE",
    });

    expect(
      adminVehicleCreateSchema.safeParse({
        ...vehicleInput,
        id: "chosen-by-client",
      }).success,
    ).toBe(false);
    expect(
      adminVehiclePatchSchema.safeParse({ status: "ARCHIVED" }).success,
    ).toBe(false);
    expect(adminVehiclePatchSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a complete contiguous tariff set", () => {
    const result = adminPricingReplaceSchema.parse(pricing);

    expect(result.rules.map(({ minDays, maxDays }) => [minDays, maxDays]))
      .toEqual([
        [1, 2],
        [3, 6],
        [7, 14],
        [15, null],
      ]);
  });

  it.each([
    [
      "a gap",
      {
        rules: [
          { minDays: 1, maxDays: 2, pricePerDay: "100" },
          { minDays: 4, maxDays: null, pricePerDay: "80" },
        ],
      },
    ],
    [
      "a closed final tier",
      { rules: [{ minDays: 1, maxDays: 365, pricePerDay: "100" }] },
    ],
    [
      "an early open tier",
      {
        rules: [
          { minDays: 1, maxDays: null, pricePerDay: "100" },
          { minDays: 3, maxDays: null, pricePerDay: "80" },
        ],
      },
    ],
  ])("rejects pricing with %s", (_label, input) => {
    expect(adminPricingReplaceSchema.safeParse(input).success).toBe(false);
  });

  it("accepts only safe image URL fields", () => {
    expect(
      adminImagesReplaceSchema.parse({
        images: [
          { url: "/cars/rav4.jpg", alt: "Toyota RAV4", sortOrder: 0 },
          {
            url: "https://cdn.example.test/rav4-2.jpg",
            sortOrder: 1,
          },
        ],
      }).images,
    ).toHaveLength(2);

    expect(
      adminImagesReplaceSchema.safeParse({
        images: [
          {
            url: "javascript:alert(1)",
            sortOrder: 0,
            vehicleId: "mass-assignment",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("caps all admin pagination at 50 and rejects unknown filters", () => {
    expect(
      adminVehicleListQuerySchema.parse({ page: "2", pageSize: "50" }),
    ).toMatchObject({ page: 2, pageSize: 50 });
    expect(
      adminVehicleListQuerySchema.safeParse({ pageSize: "51" }).success,
    ).toBe(false);
    expect(
      adminUserListQuerySchema.safeParse({ search: "admin" }).success,
    ).toBe(false);
  });

  it("whitelists booking status, manager comment and user role mutations", () => {
    expect(
      adminBookingStatusSchema.safeParse({
        status: "CONFIRMED",
        managerComment: "Approved",
        paymentStatus: "PAID",
      }).success,
    ).toBe(false);
    expect(
      adminUserRoleSchema.safeParse({
        role: "ADMIN",
        sessionVersion: 0,
      }).success,
    ).toBe(false);
  });
});
