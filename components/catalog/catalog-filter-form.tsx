import Form from "next/form";
import Link from "next/link";
import type { CatalogFilterValues } from "@/server/services/catalog/types";

type CatalogFilterFormProps = Readonly<{
  filters: CatalogFilterValues;
}>;

export function CatalogFilterForm({ filters }: CatalogFilterFormProps) {
  return (
    <Form action="/vehicles" className="catalog-filter-form">
      <label>
        Category
        <input name="category" defaultValue={filters.category} placeholder="SUV" />
      </label>
      <label>
        Minimum daily price
        <input
          name="minPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={filters.minPrice}
        />
      </label>
      <label>
        Maximum daily price
        <input
          name="maxPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={filters.maxPrice}
        />
      </label>
      <label>
        Minimum seats
        <input
          name="seats"
          type="number"
          min="1"
          max="100"
          defaultValue={filters.seats}
        />
      </label>
      <label>
        Transmission
        <input
          name="transmission"
          defaultValue={filters.transmission}
          placeholder="AUTOMATIC"
        />
      </label>
      <label>
        Fuel
        <input name="fuel" defaultValue={filters.fuel} placeholder="PETROL" />
      </label>
      <label>
        Drive
        <input name="drive" defaultValue={filters.drive} placeholder="AWD" />
      </label>
      <label>
        Start date with offset
        <input
          name="startDate"
          defaultValue={filters.startDate}
          placeholder="2026-11-10T10:00:00+04:00"
        />
      </label>
      <label>
        End date with offset
        <input
          name="endDate"
          defaultValue={filters.endDate}
          placeholder="2026-11-13T10:00:00+04:00"
        />
      </label>
      <label>
        Sort
        <select name="sort" defaultValue={filters.sort}>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="year_desc">Year: newest first</option>
          <option value="year_asc">Year: oldest first</option>
          <option value="brand_asc">Brand: A to Z</option>
          <option value="brand_desc">Brand: Z to A</option>
        </select>
      </label>
      <label>
        Items per page
        <select name="pageSize" defaultValue={String(filters.pageSize)}>
          <option value="6">6</option>
          <option value="12">12</option>
          <option value="24">24</option>
          <option value="50">50</option>
        </select>
      </label>
      <div className="catalog-filter-actions">
        <button type="submit">Apply filters</button>
        <Link href="/vehicles">Reset</Link>
      </div>
    </Form>
  );
}
