export type CatalogImage = Readonly<{
  id: string;
  url: string;
  alt: string;
}>;

export type CatalogListItem = Readonly<{
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  seats: number;
  transmission: string;
  fuel: string;
  drive: string;
  location: string;
  insuranceIncluded: boolean;
  pricePerDay: string;
  currency: string;
  pricingPeriodDays: number | null;
  image: CatalogImage | null;
}>;

export type CatalogFilterValues = Readonly<{
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  seats?: number;
  transmission?: string;
  fuel?: string;
  drive?: string;
  sort: string;
  pageSize: number;
  startDate?: string;
  endDate?: string;
}>;

export type CatalogPage = Readonly<{
  items: CatalogListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  filters: CatalogFilterValues;
}>;

export type CatalogPricingTier = Readonly<{
  id: string;
  minDays: number;
  maxDays: number | null;
  pricePerDay: string;
  currency: string;
}>;

export type CatalogVehicleDetail = Readonly<{
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  description: string | null;
  seats: number;
  transmission: string;
  fuel: string;
  drive: string;
  engine: string | null;
  depositAmount: string;
  currency: string;
  insuranceIncluded: boolean;
  location: string;
  images: CatalogImage[];
  pricingRules: CatalogPricingTier[];
}>;

export type VehicleQuote = Readonly<{
  totalDays: number;
  pricePerDay: string;
  totalAmount: string;
  depositAmount: string;
  totalDue: string;
  currency: string;
}>;
