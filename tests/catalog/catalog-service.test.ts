import { Prisma, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type {
  CatalogRepository,
  CatalogVehicleDetailRecord,
  CatalogVehicleRecord,
} from "@/server/repositories/catalog";
import { getCatalogVehicleBySlug } from "@/server/services/catalog/get-vehicle";
import { listCatalogVehicles } from "@/server/services/catalog/list-vehicles";

function vehicle(
  id: string,
  options: {
    brand?: string;
    year?: number;
    prices?: [string, string, string, string];
  } = {},
): CatalogVehicleRecord {
  const prices = options.prices ?? ["100", "90", "80", "70"];
  return {
    id,
    slug: `slug-${id}`,
    brand: options.brand ?? "Toyota",
    model: `Model ${id}`,
    year: options.year ?? 2024,
    category: "SUV",
    seats: 5,
    transmission: "AUTOMATIC",
    fuel: "PETROL",
    drive: "AWD",
    depositAmount: new Prisma.Decimal("300"),
    currency: "GEL",
    insuranceIncluded: true,
    location: "Tbilisi",
    images: [],
    pricingRules: [
      { id: `${id}-1`, minDays: 1, maxDays: 2, pricePerDay: new Prisma.Decimal(prices[0]), currency: "GEL" },
      { id: `${id}-2`, minDays: 3, maxDays: 6, pricePerDay: new Prisma.Decimal(prices[1]), currency: "GEL" },
      { id: `${id}-3`, minDays: 7, maxDays: 14, pricePerDay: new Prisma.Decimal(prices[2]), currency: "GEL" },
      { id: `${id}-4`, minDays: 15, maxDays: null, pricePerDay: new Prisma.Decimal(prices[3]), currency: "GEL" },
    ],
  };
}

const prismaStub = {} as PrismaClient;

describe("listCatalogVehicles", () => {
  it("sorts minimum daily prices stably by id and paginates", async () => {
    const findPublicVehicles = vi.fn().mockResolvedValue([
      vehicle("b", { prices: ["80", "70", "60", "50"] }),
      vehicle("c", { prices: ["90", "80", "70", "60"] }),
      vehicle("a", { prices: ["80", "70", "60", "50"] }),
    ]);

    const firstPage = await listCatalogVehicles(
      { pageSize: "2", sort: "price_asc" },
      {
        prisma: prismaStub,
        repository: { findPublicVehicles },
      },
    );
    const secondPage = await listCatalogVehicles(
      { page: "2", pageSize: "2", sort: "price_asc" },
      {
        prisma: prismaStub,
        repository: { findPublicVehicles },
      },
    );

    expect(firstPage.items.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(firstPage).toMatchObject({
      totalItems: 3,
      totalPages: 2,
      hasNextPage: true,
    });
    expect(secondPage.items.map(({ id }) => id)).toEqual(["c"]);
  });

  it("uses the duration tier for date pricing and price filters", async () => {
    const findPublicVehicles = vi.fn().mockResolvedValue([
      vehicle("cheap", { prices: ["100", "75", "60", "50"] }),
      vehicle("expensive", { prices: ["100", "95", "60", "50"] }),
    ]);

    const result = await listCatalogVehicles(
      {
        startDate: "2026-11-10T06:00:00Z",
        endDate: "2026-11-13T06:00:00Z",
        maxPrice: "80",
      },
      {
        prisma: prismaStub,
        repository: { findPublicVehicles },
        now: () => new Date("2026-11-01T00:00:00Z"),
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "cheap",
      pricePerDay: "75.00",
      pricingPeriodDays: 3,
    });
  });

  it.each([
    ["year_desc", ["new", "old"]],
    ["brand_asc", ["old", "new"]],
  ] as const)("supports %s sorting", async (sort, expectedIds) => {
    const findPublicVehicles = vi.fn().mockResolvedValue([
      vehicle("new", { brand: "Zulu", year: 2025 }),
      vehicle("old", { brand: "Alpha", year: 2020 }),
    ]);
    const result = await listCatalogVehicles(
      { sort },
      { prisma: prismaStub, repository: { findPublicVehicles } },
    );

    expect(result.items.map(({ id }) => id)).toEqual(expectedIds);
  });
});

describe("getCatalogVehicleBySlug", () => {
  it("returns an image and tariff DTO without Prisma decimals", async () => {
    const record = {
      ...vehicle("detail"),
      description: "Reliable car",
      engine: "2.0L",
      images: [
        { id: "image", url: "https://example.test/car.jpg", alt: null, sortOrder: 0 },
      ],
    } satisfies CatalogVehicleDetailRecord;
    const findPublicVehicleBySlug: CatalogRepository["findPublicVehicleBySlug"] =
      vi.fn().mockResolvedValue(record);

    const result = await getCatalogVehicleBySlug("slug-detail", {
      prisma: prismaStub,
      repository: { findPublicVehicleBySlug },
    });

    expect(result).toMatchObject({
      slug: "slug-detail",
      depositAmount: "300.00",
      images: [{ alt: "Toyota Model detail" }],
    });
    expect(result?.pricingRules[0]?.pricePerDay).toBe("100.00");
  });
});
