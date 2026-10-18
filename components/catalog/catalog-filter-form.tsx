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

export function CatalogFilterForm({ filters, children, summary }: CatalogFilterFormProps) {
  const categoryField = (
    <label>
      {children === undefined ? "Category" : "Категория"}
      <Input name="category" defaultValue={filters.category} placeholder="SUV" />
    </label>
  );
  const minPriceField = (
    <label>
      {children === undefined ? "Minimum daily price" : "От"}
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
      {children === undefined ? "Maximum daily price" : "До"}
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
      {children === undefined ? "Minimum seats" : "Количество мест (от)"}
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
      {children === undefined ? "Transmission" : "Коробка передач"}
      <Input
        name="transmission"
        defaultValue={filters.transmission}
        placeholder="AUTOMATIC"
      />
    </label>
  );
  const fuelField = (
    <label>
      {children === undefined ? "Fuel" : "Тип топлива"}
      <Input name="fuel" defaultValue={filters.fuel} placeholder="PETROL" />
    </label>
  );
  const driveField = (
    <label>
      {children === undefined ? "Drive" : "Привод"}
      <Input name="drive" defaultValue={filters.drive} placeholder="AWD" />
    </label>
  );
  const startDateField = (
    <label>
      {children === undefined ? "Start date with offset" : "Начало аренды"}
      <Input
        name="startDate"
        defaultValue={filters.startDate}
        placeholder="2026-11-10T10:00:00+04:00"
      />
    </label>
  );
  const endDateField = (
    <label>
      {children === undefined ? "End date with offset" : "Возврат автомобиля"}
      <Input
        name="endDate"
        defaultValue={filters.endDate}
        placeholder="2026-11-13T10:00:00+04:00"
      />
    </label>
  );
  const sortField = (
    <label>
      {children === undefined ? "Sort" : "Сортировка"}
      <Select name="sort" defaultValue={filters.sort}>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="year_desc">Year: newest first</option>
        <option value="year_asc">Year: oldest first</option>
        <option value="brand_asc">Brand: A to Z</option>
        <option value="brand_desc">Brand: Z to A</option>
      </Select>
    </label>
  );
  const pageSizeField = (
    <label>
      {children === undefined ? "Items per page" : "На странице"}
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
          <Button type="submit">Apply filters</Button>
          <Link href="/vehicles">Reset</Link>
        </div>
      </Form>
    );
  }

  return (
    <Form action="/vehicles" className={styles.catalogForm}>
      <div className={styles.searchBar} aria-label="Rental search">
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
          Показать автомобили <span aria-hidden="true">→</span>
        </Button>
      </div>

      <div className={styles.catalogLayout}>
        <aside className={styles.sidebar} aria-labelledby="catalog-filters-title">
          <Card className={styles.filterCard}>
            <div className={styles.filterHeading}>
              <h2 id="catalog-filters-title">Фильтры</h2>
              <Link href="/vehicles">Сбросить</Link>
            </div>
            <p className={styles.availabilityNote}><span aria-hidden="true" />Только доступные</p>
            <fieldset className={styles.priceFields}>
              <legend>Цена за сутки</legend>
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
              <Button type="submit">Применить фильтры</Button>
              <Link href="/vehicles">Очистить всё</Link>
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
