import { CatalogDateInput } from "@/components/catalog/catalog-date-input";
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
  const categoryField = (
    <label>
      {children === undefined ? t("Category") : t("Категория")}
      <Input name="category" defaultValue={filters.category} placeholder={t("SUV")} />
    </label>
  );
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
  const seatsField = (
    <label>
      {children === undefined ? t("Minimum seats") : t("Количество мест (от)")}
      <Input
        name="seats"
        type="number"
        min="1"
        max="100"
        defaultValue={filters.seats}
      />
    </label>
  );
  const transmissionField = (
    <label>
      {children === undefined ? t("Transmission") : t("Коробка передач")}
      <Input
        name="transmission"
        defaultValue={filters.transmission}
        placeholder={t("AUTOMATIC")}
      />
    </label>
  );
  const fuelField = (
    <label>
      {children === undefined ? t("Fuel") : t("Тип топлива")}
      <Input name="fuel" defaultValue={filters.fuel} placeholder={t("PETROL")} />
    </label>
  );
  const driveField = (
    <label>
      {children === undefined ? t("Drive") : t("Привод")}
      <Input name="drive" defaultValue={filters.drive} placeholder={t("AWD")} />
    </label>
  );
  const startDateField = (
    <label>
      {children === undefined ? t("Start date with offset") : t("Начало аренды")}
      <CatalogDateInput key={filters.startDate ?? "startDate"} name="startDate" defaultValue={filters.startDate} />
    </label>
  );
  const endDateField = (
    <label>
      {children === undefined ? t("End date with offset") : t("Возврат автомобиля")}
      <CatalogDateInput key={filters.endDate ?? "endDate"} name="endDate" defaultValue={filters.endDate} />
    </label>
  );
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
        {startDateField}
        {endDateField}
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
        <div className={styles.searchField}>
          <span className={styles.calendarIcon} aria-hidden="true" />
          {startDateField}
        </div>
        <div className={styles.searchField}>
          <span className={styles.calendarIcon} aria-hidden="true" />
          {endDateField}
        </div>
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
            <p className={styles.availabilityNote}><span aria-hidden="true" />{t("Только доступные")}</p>
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
