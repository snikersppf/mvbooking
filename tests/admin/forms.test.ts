import { describe, expect, it } from "vitest";
import {
  adminImagesFormSchema,
  adminPricingFormSchema,
  adminUserRoleFormSchema,
  adminUserStatusFormSchema,
  adminVehicleFormSchema,
  createAdminBookingStatusFormSchema,
  emptyAdminVehicleFormValues,
  toAdminBookingStatusPayload,
  toAdminImagesPayload,
  toAdminPricingPayload,
  toAdminVehicleCreatePayload,
} from "@/components/admin/form-schemas";

describe("admin vehicle form schema", () => {
  it("builds a whitelisted API payload from valid form values", () => {
    const values = {
      ...emptyAdminVehicleFormValues(),
      slug: "toyota-rav4",
      brand: " Toyota ",
      model: " RAV4 ",
      year: "2025",
      description: " ",
      seats: "5",
      engine: " ",
      depositAmount: "300.005",
    };

    expect(adminVehicleFormSchema.safeParse(values).success).toBe(true);
    expect(toAdminVehicleCreatePayload(values)).toEqual({
      slug: "toyota-rav4",
      brand: "Toyota",
      model: "RAV4",
      year: 2025,
      category: "ECONOMY",
      description: null,
      seats: 5,
      transmission: "AUTOMATIC",
      fuel: "PETROL",
      drive: "FWD",
      engine: null,
      depositAmount: "300.005",
      insuranceIncluded: false,
      status: "AVAILABLE",
      location: "Tbilisi",
      currency: "GEL",
    });
  });

  it("rejects extra fields and invalid editable statuses", () => {
    const values = emptyAdminVehicleFormValues();
    expect(
      adminVehicleFormSchema.safeParse({
        ...values,
        unexpected: "mass assignment",
      }).success,
    ).toBe(false);
    expect(
      adminVehicleFormSchema.safeParse({
        ...values,
        status: "ARCHIVED",
      }).success,
    ).toBe(false);
  });
});

describe("admin pricing form schema", () => {
  const validPricing = {
    rules: [
      { minDays: "1", maxDays: "2", pricePerDay: "100.00" },
      { minDays: "3", maxDays: "6", pricePerDay: "90.00" },
      { minDays: "7", maxDays: "14", pricePerDay: "80.00" },
      { minDays: "15", maxDays: "", pricePerDay: "70.00" },
    ],
  };

  it("accepts contiguous tiers and converts the open maximum to null", () => {
    expect(adminPricingFormSchema.safeParse(validPricing).success).toBe(true);
    expect(toAdminPricingPayload(validPricing)).toEqual({
      rules: [
        { minDays: 1, maxDays: 2, pricePerDay: "100.00", currency: "GEL" },
        { minDays: 3, maxDays: 6, pricePerDay: "90.00", currency: "GEL" },
        { minDays: 7, maxDays: 14, pricePerDay: "80.00", currency: "GEL" },
        { minDays: 15, maxDays: null, pricePerDay: "70.00", currency: "GEL" },
      ],
    });
  });

  it.each([
    {
      label: "a gap",
      rules: [
        { minDays: "1", maxDays: "2", pricePerDay: "100" },
        { minDays: "4", maxDays: "", pricePerDay: "90" },
      ],
    },
    {
      label: "a closed final tier",
      rules: [{ minDays: "1", maxDays: "365", pricePerDay: "100" }],
    },
    {
      label: "a zero price",
      rules: [{ minDays: "1", maxDays: "", pricePerDay: "0" }],
    },
  ])("rejects $label", ({ rules }) => {
    expect(adminPricingFormSchema.safeParse({ rules }).success).toBe(false);
  });
});

describe("admin image and status form schemas", () => {
  it("accepts HTTP and local image URLs and builds the API payload", () => {
    const values = {
      images: [
        { url: "/vehicles/front.jpg", alt: "Front", sortOrder: "0" },
        {
          url: "https://cdn.example.test/side.jpg",
          alt: "",
          sortOrder: "1",
        },
      ],
    };
    expect(adminImagesFormSchema.safeParse(values).success).toBe(true);
    expect(toAdminImagesPayload(values)).toEqual({
      images: [
        { url: "/vehicles/front.jpg", alt: "Front", sortOrder: 0 },
        {
          url: "https://cdn.example.test/side.jpg",
          alt: null,
          sortOrder: 1,
        },
      ],
    });
  });

  it("rejects unsafe image URLs", () => {
    expect(
      adminImagesFormSchema.safeParse({
        images: [{ url: "javascript:alert(1)", alt: "", sortOrder: "0" }],
      }).success,
    ).toBe(false);
  });

  it("allows only transitions supplied by the server page", () => {
    const schema = createAdminBookingStatusFormSchema([
      "CONFIRMED",
      "REJECTED",
    ]);
    expect(
      schema.safeParse({ status: "CONFIRMED", managerComment: "Approved" })
        .success,
    ).toBe(true);
    expect(
      schema.safeParse({ status: "COMPLETED", managerComment: "" }).success,
    ).toBe(false);
    expect(
      toAdminBookingStatusPayload(
        { status: "REJECTED", managerComment: " Not available " },
        ["CONFIRMED", "REJECTED"],
      ),
    ).toEqual({ status: "REJECTED", managerComment: "Not available" });
  });

  it("keeps user role and status forms strict", () => {
    expect(adminUserRoleFormSchema.safeParse({ role: "ADMIN" }).success).toBe(
      true,
    );
    expect(
      adminUserRoleFormSchema.safeParse({ role: "ADMIN", status: "ACTIVE" })
        .success,
    ).toBe(false);
    expect(
      adminUserStatusFormSchema.safeParse({ status: "SUSPENDED" }).success,
    ).toBe(true);
  });
});

