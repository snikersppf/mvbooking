import { Prisma } from "@prisma/client";
import type {
  CatalogVehicleRecord,
  PublicVehicleFilters,
} from "@/server/repositories/catalog";
import { BookingRuleError } from "@/server/services/booking/errors";
import { calculateBookingMoney } from "@/server/services/booking/money";
import { selectPricingTier } from "@/server/services/booking/pricing";
import type {
  CatalogFilterValues,
  CatalogListItem,
  CatalogPage,
  VehicleQuote,
} from "@/server/services/catalog/types";
import type {
  AvailableVehicleListQuery,
  CatalogQuery,
} from "@/server/validators/catalog";

type CatalogPageQuery = CatalogQuery | AvailableVehicleListQuery;

type PricedCatalogItem = Readonly<{
  item: CatalogListItem;
  price: Prisma.Decimal;
}>;

function assertPricingCurrency(
  vehicle: CatalogVehicleRecord,
  currency: string,
): void {
  if (currency !== vehicle.currency) {
    throw new BookingRuleError(
      "INVALID_PRICING_TIER",
      "Vehicle and pricing currencies are inconsistent.",
    );
  }
}

function resolvePricePerDay(
  vehicle: CatalogVehicleRecord,
  totalDays: number | null,
): Prisma.Decimal {
  if (vehicle.pricingRules.length === 0) {
    throw new BookingRuleError(
      "PRICING_TIER_NOT_FOUND",
      "Vehicle has no pricing tiers.",
    );
  }

  if (totalDays !== null) {
    const tier = selectPricingTier(totalDays, vehicle.pricingRules);
    assertPricingCurrency(vehicle, tier.currency);
    return tier.pricePerDay;
  }

  let cheapest = vehicle.pricingRules[0];
  for (const tier of vehicle.pricingRules) {
    assertPricingCurrency(vehicle, tier.currency);
    if (tier.pricePerDay.lessThan(cheapest.pricePerDay)) cheapest = tier;
  }

  return cheapest.pricePerDay;
}

function toPricedCatalogItem(
  vehicle: CatalogVehicleRecord,
  totalDays: number | null,
): PricedCatalogItem {
  const price = resolvePricePerDay(vehicle, totalDays);
  const image = vehicle.images[0] ?? null;

  return {
    price,
    item: {
      id: vehicle.id,
      slug: vehicle.slug,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      category: vehicle.category,
      seats: vehicle.seats,
      transmission: vehicle.transmission,
      fuel: vehicle.fuel,
      drive: vehicle.drive,
      location: vehicle.location,
      insuranceIncluded: vehicle.insuranceIncluded,
      pricePerDay: price.toFixed(2),
      currency: vehicle.currency,
      pricingPeriodDays: totalDays,
      image: image
        ? {
            id: image.id,
            url: image.url,
            alt: image.alt ?? `${vehicle.brand} ${vehicle.model}`,
          }
        : null,
    },
  };
}

function compareText(first: string, second: string): number {
  const normalizedFirst = first.toLocaleLowerCase("en");
  const normalizedSecond = second.toLocaleLowerCase("en");
  if (normalizedFirst < normalizedSecond) return -1;
  if (normalizedFirst > normalizedSecond) return 1;
  return first < second ? -1 : first > second ? 1 : 0;
}

function compareCatalogItems(
  first: PricedCatalogItem,
  second: PricedCatalogItem,
  sort: CatalogPageQuery["sort"],
): number {
  const [field, direction] = sort.split("_") as [
    "price" | "year" | "brand",
    "asc" | "desc",
  ];
  let primary = 0;

  if (field === "price") primary = first.price.comparedTo(second.price);
  if (field === "year") primary = first.item.year - second.item.year;
  if (field === "brand") {
    primary = compareText(first.item.brand, second.item.brand);
  }

  if (primary !== 0) return direction === "asc" ? primary : -primary;
  return compareText(first.item.id, second.item.id);
}

function matchesPriceRange(
  item: PricedCatalogItem,
  query: CatalogPageQuery,
): boolean {
  if (
    query.minPrice !== undefined &&
    item.price.lessThan(new Prisma.Decimal(query.minPrice))
  ) {
    return false;
  }
  if (
    query.maxPrice !== undefined &&
    item.price.greaterThan(new Prisma.Decimal(query.maxPrice))
  ) {
    return false;
  }
  return true;
}

function catalogFilterValues(query: CatalogPageQuery): CatalogFilterValues {
  return {
    category: query.category,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    seats: query.seats,
    transmission: query.transmission,
    fuel: query.fuel,
    drive: query.drive,
    sort: query.sort,
    pageSize: query.pageSize,
    startDate: query.startDate?.toISOString(),
    endDate: query.endDate?.toISOString(),
  };
}

export function publicVehicleFiltersFromQuery(
  query: CatalogPageQuery,
): PublicVehicleFilters {
  return {
    category: query.category,
    seats: query.seats,
    transmission: query.transmission,
    fuel: query.fuel,
    drive: query.drive,
  };
}

export function buildCatalogPage(
  vehicles: readonly CatalogVehicleRecord[],
  query: CatalogPageQuery,
  totalDays: number | null,
): CatalogPage {
  const priced = vehicles
    .map((vehicle) => toPricedCatalogItem(vehicle, totalDays))
    .filter((item) => matchesPriceRange(item, query))
    .sort((first, second) => compareCatalogItems(first, second, query.sort));
  const totalItems = priced.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  const offset = (query.page - 1) * query.pageSize;

  return {
    items: priced
      .slice(offset, offset + query.pageSize)
      .map(({ item }) => item),
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: query.page > 1,
    hasNextPage: query.page < totalPages,
    filters: catalogFilterValues(query),
  };
}

export function buildVehicleQuote(
  vehicle: CatalogVehicleRecord,
  totalDays: number,
): VehicleQuote {
  const pricePerDay = resolvePricePerDay(vehicle, totalDays);
  const money = calculateBookingMoney({
    pricePerDay,
    totalDays,
    depositAmount: vehicle.depositAmount,
  });

  return {
    totalDays,
    pricePerDay: money.pricePerDay.toFixed(2),
    totalAmount: money.totalAmount.toFixed(2),
    depositAmount: money.depositAmount.toFixed(2),
    totalDue: money.totalDue.toFixed(2),
    currency: vehicle.currency,
  };
}
