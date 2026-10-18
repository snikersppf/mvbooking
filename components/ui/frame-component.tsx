import { CatalogFilterForm } from "@/components/catalog/catalog-filter-form";
import styles from "./frame-component.module.css";

export default function RentalSearch() {
  return (
    <section className={styles.rentalSearchBarWrapper} aria-label="Поиск автомобиля">
      <details className={styles.searchDisclosure}>
        <summary>Найти автомобиль <span>Категория, даты и стоимость <span aria-hidden="true">+</span></span></summary>
        <CatalogFilterForm filters={{ sort: "price_asc", pageSize: 12 }} />
      </details>
    </section>
  );
}
