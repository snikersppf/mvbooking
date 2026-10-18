import { getTranslations } from "@/lib/i18n/server";
import { PageShell } from "@/components/ui/page-shell";
import { ZodError } from "zod";
import { CatalogFilterForm } from "@/components/catalog/catalog-filter-form";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { VehicleCard } from "@/components/catalog/vehicle-card";
import { CatalogHero, CatalogGuidance } from "@/components/catalog/catalog-presentation";
import Footer from "@/components/ui/footer";
import styles from "@/components/catalog/catalog.module.css";
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
  const t = await getTranslations();
  const result = await loadCatalog(await searchParams);

  if (!result.catalog) {
    return (
      <PageShell className={`${styles.page} catalog-shell`}>
        <CatalogHero />
        <div className={styles.content}>
          <CatalogFilterForm
            filters={EMPTY_FILTERS}
            summary={<><h2>{t("Доступные автомобили")}</h2><p>{t("Choose valid filters and try again.")}</p></>}
          >
            {result.invalidFilters ? (
              <p className="error-message">{t("The catalog filters are invalid.")}</p>
            ) : null}
          </CatalogFilterForm>
        </div>
        <CatalogGuidance />
        <Footer />
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
    <PageShell className={`${styles.page} catalog-shell`}>
      <CatalogHero />
      <div className={styles.content}>
        <CatalogFilterForm
          filters={catalog.filters}
          summary={
            <>
              <h2>{t("Доступные автомобили")}</h2>
              <p>{t("Найдено автомобилей: ")}{catalog.totalItems}</p>
            </>
          }
        >
          {catalog.items.length > 0 ? (
            <section className={`${styles.vehicleGrid} vehicle-grid`} aria-label={t("Vehicles")}>
              {catalog.items.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </section>
          ) : (
            <p className="empty-state">{t("No vehicles match these filters.")}</p>
          )}

          <CatalogPagination
            page={catalog.page}
            totalPages={catalog.totalPages}
            previousHref={previousHref}
            nextHref={nextHref}
          />
        </CatalogFilterForm>
      </div>
      <CatalogGuidance />
      <Footer />
    </PageShell>
  );
}
