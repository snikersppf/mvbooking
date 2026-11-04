import { ADMIN_DRIVES, ADMIN_FUELS, ADMIN_TRANSMISSIONS, ADMIN_VEHICLE_CATEGORIES } from "@/lib/admin-input";
import { CATALOG_SEAT_COUNTS } from "@/lib/catalog-seats";
import { CatalogDateRange } from "@/components/catalog/catalog-date-input";
import { MobileFilters } from "./mobile-filters";
import { getTranslations } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Form from "next/form";
import Link from "next/link";
import type { CatalogFilterValues } from "@/server/services/catalog/types";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import styles from "./catalog.module.css";

type CatalogFilterFormProps = Readonly<{
  filters: CatalogFilterValues;
  children?: ReactNode;
  summary?: ReactNode;
}>;

export async function CatalogFilterForm({ filters, children, summary }: CatalogFilterFormProps) {
  const t = await getTranslations();
  const selectField = (label: string, name: string, choices: readonly string[], current?: string | number) => {
    const currentValue = current === undefined ? "" : String(current);
    const selected = name === "seats" && !choices.includes(currentValue) ? "" : currentValue;
    // Keep existing bookmarked filters representable, including older catalogue values.
    const options = selected && !choices.includes(selected) ? [selected, ...choices] : choices;
    return <label>{t(label)}
      <Select key={`${name}:${selected}`} name={name} defaultValue={selected}>
        <option value="">{t("All")}</option>
        {options.map((value) => <option key={value} value={value}>
          {t(value)}
        </option>)}
      </Select>
    </label>;
  };
  const categoryField = selectField("Category", "category", ADMIN_VEHICLE_CATEGORIES, filters.category);
  const minPriceField = (
    <label>
      {children === undefined ? t("Minimum daily price") : t("От")}
      <Input
        name="minPrice"
        type="number"
        min="0"
        step="0.01"
        defaultValue={filters.minPrice}
      />
    </label>
  );
  const maxPriceField = (
    <label>
      {children === undefined ? t("Maximum daily price") : t("До")}
      <Input
        name="maxPrice"
        type="number"
        min="0"
        step="0.01"
        defaultValue={filters.maxPrice}
      />
    </label>
  );
  const seatsField = selectField("Seats", "seats", CATALOG_SEAT_COUNTS.map(String), filters.seats);
  const transmissionField = selectField("Transmission", "transmission", ADMIN_TRANSMISSIONS, filters.transmission);
  const fuelField = selectField("Fuel", "fuel", ADMIN_FUELS, filters.fuel);
  const driveField = selectField("Drive", "drive", ADMIN_DRIVES, filters.drive);
  const dateRange = <CatalogDateRange idPrefix="catalog" className={styles.dateRange}
    key={`${filters.startDate ?? ""}:${filters.endDate ?? ""}`}
    startDate={filters.startDate} endDate={filters.endDate} />;
  const sortField = (
    <label>
      {children === undefined ? t("Sort") : t("Сортировка")}
      <Select name="sort" defaultValue={filters.sort}>
        <option value="price_asc">{t("Price: low to high")}</option>
        <option value="price_desc">{t("Price: high to low")}</option>
        <option value="year_desc">{t("Year: newest first")}</option>
        <option value="year_asc">{t("Year: oldest first")}</option>
        <option value="brand_asc">{t("Brand: A to Z")}</option>
        <option value="brand_desc">{t("Brand: Z to A")}</option>
      </Select>
    </label>
  );
  const pageSizeField = (
    <label>
      {children === undefined ? t("Items per page") : t("На странице")}
      <Select name="pageSize" defaultValue={String(filters.pageSize)}>
        <option value="6">6</option>
        <option value="12">12</option>
        <option value="24">24</option>
        <option value="50">50</option>
      </Select>
    </label>
  );

  if (children === undefined) {
    return (
      <Form action="/vehicles" className="catalog-filter-form">
        {categoryField}
        {minPriceField}
        {maxPriceField}
        {seatsField}
        {transmissionField}
        {fuelField}
        {driveField}
        {dateRange}
        {sortField}
        {pageSizeField}
        <div className="catalog-filter-actions">
          <Button type="submit">{t("Apply filters")}</Button>
          <Link href="/vehicles">{t("Reset")}</Link>
        </div>
      </Form>
    );
  }

  return (
    <Form action="/vehicles" className={styles.catalogForm}>
      <div className={styles.searchBar} aria-label={t("Rental search")}>
        {dateRange}
        <div className={styles.searchField}>
          <span className={styles.carIcon} aria-hidden="true" />
          {categoryField}
        </div>
        <Button type="submit" className={styles.searchButton}>
          {t("Показать автомобили ")}<span aria-hidden="true">→</span>
        </Button>
      </div>

      <div className={styles.catalogLayout}>
        <aside className={styles.sidebar} aria-labelledby="catalog-filters-title">
          <Card className={styles.filterCard}>
            <div className={styles.filterHeading}>
              <h2 id="catalog-filters-title">{t("Фильтры")}</h2>
              <Link href="/vehicles">{t("Сбросить")}</Link>
            </div>
            <MobileFilters>
              <fieldset className={styles.priceFields}>
                <legend>{t("Цена за сутки")}</legend>
                {minPriceField}
                {maxPriceField}
              </fieldset>
              <div className={styles.filterFields}>
                {transmissionField}
                {driveField}
                {seatsField}
                {fuelField}
              </div>
              <div className={styles.filterActions}>
                <Button type="submit">{t("Применить фильтры")}</Button>
                <Link href="/vehicles">{t("Очистить всё")}</Link>
              </div>
            </MobileFilters>
          </Card>
        </aside>

        <div className={styles.results} id="catalog-results">
          <div className={styles.resultsHeader}>
            <div className={styles.resultSummary}>{summary}</div>
            <div className={styles.sortControls}>
              {sortField}
              {pageSizeField}
            </div>
          </div>
          {children}
        </div>
      </div>
    </Form>
  );
}
