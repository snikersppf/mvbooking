import type { CatalogFilterValues } from "@/server/services/catalog/types";

function setQueryValue(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value !== undefined && value !== "") {
    searchParams.set(key, String(value));
  }
}

export function catalogPageHref(
  filters: CatalogFilterValues,
  page: number,
): string {
  const searchParams = new URLSearchParams();
  setQueryValue(searchParams, "category", filters.category);
  setQueryValue(searchParams, "minPrice", filters.minPrice);
  setQueryValue(searchParams, "maxPrice", filters.maxPrice);
  setQueryValue(searchParams, "seats", filters.seats);
  setQueryValue(searchParams, "transmission", filters.transmission);
  setQueryValue(searchParams, "fuel", filters.fuel);
  setQueryValue(searchParams, "drive", filters.drive);
  setQueryValue(searchParams, "sort", filters.sort);
  setQueryValue(searchParams, "page", page);
  setQueryValue(searchParams, "pageSize", filters.pageSize);
  setQueryValue(searchParams, "startDate", filters.startDate);
  setQueryValue(searchParams, "endDate", filters.endDate);
  return `/vehicles?${searchParams.toString()}`;
}
