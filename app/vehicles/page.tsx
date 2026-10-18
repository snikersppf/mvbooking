import { PageShell } from "@/components/ui/page-shell";
import Link from "next/link";
import { ZodError } from "zod";
import { CatalogFilterForm } from "@/components/catalog/catalog-filter-form";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { VehicleCard } from "@/components/catalog/vehicle-card";
import { catalogPageHref } from "@/lib/catalog-url";
import { BookingRuleError } from "@/server/services/booking/errors";
import { listCatalogVehicles } from "@/server/services/catalog/list-vehicles";
import type {
  CatalogFilterValues,
  CatalogPage,
} from "@/server/services/catalog/types";

type RawSearchParams = Record<string, string | string[] | undefined>;

type VehiclesPageProps = Readonly<{
  searchParams: Promise<RawSearchParams>;
}>;

const EMPTY_FILTERS: CatalogFilterValues = {
  sort: "price_asc",
  pageSize: 12,
};

async function loadCatalog(
  searchParams: RawSearchParams,
): Promise<{ catalog: CatalogPage | null; invalidFilters: boolean }> {
  try {
    return {
      catalog: await listCatalogVehicles(searchParams),
      invalidFilters: false,
    };
  } catch (error) {
    if (error instanceof ZodError || error instanceof BookingRuleError) {
      return { catalog: null, invalidFilters: true };
    }
    throw error;
  }
}

export default async function VehiclesPage({
  searchParams,
}: VehiclesPageProps) {
  const result = await loadCatalog(await searchParams);

  if (!result.catalog) {
    return (
      <PageShell className="catalog-shell">
        <header className="catalog-header">
          <Link href="/">MVBooking</Link>
          <h1>Vehicle catalog</h1>
          <p>Choose valid filters and try again.</p>
        </header>
        <CatalogFilterForm filters={EMPTY_FILTERS} />
        {result.invalidFilters ? (
          <p className="error-message">The catalog filters are invalid.</p>
        ) : null}
      </PageShell>
    );
  }

  const catalog = result.catalog;
  const previousHref = catalog.hasPreviousPage
    ? catalogPageHref(catalog.filters, catalog.page - 1)
    : null;
  const nextHref = catalog.hasNextPage
    ? catalogPageHref(catalog.filters, catalog.page + 1)
    : null;

  return (
    <PageShell className="catalog-shell">
      <header className="catalog-header">
        <Link href="/">MVBooking</Link>
        <h1>Vehicle catalog</h1>
        <p>Only vehicles currently published as available are shown.</p>
      </header>

      <CatalogFilterForm filters={catalog.filters} />

      <div className="catalog-result-summary">
        <p>{catalog.totalItems} vehicles found.</p>
      </div>

      {catalog.items.length > 0 ? (
        <section className="vehicle-grid" aria-label="Vehicles">
          {catalog.items.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </section>
      ) : (
        <p className="empty-state">No vehicles match these filters.</p>
      )}

      <CatalogPagination
        page={catalog.page}
        totalPages={catalog.totalPages}
        previousHref={previousHref}
        nextHref={nextHref}
      />
    </PageShell>
  );
}
