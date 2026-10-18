import { getTranslations } from "@/lib/i18n/server";
import { CatalogFilterForm } from "@/components/catalog/catalog-filter-form";
import styles from "./frame-component.module.css";

export default async function RentalSearch() {
  const t = await getTranslations();
  return (
    <section className={styles.rentalSearchBarWrapper} aria-label={t("Поиск автомобиля")}>
      <details className={styles.searchDisclosure}>
        <summary>{t("Найти автомобиль ")}<span>{t("Категория, даты и стоимость ")}<span aria-hidden="true">+</span></span></summary>
        <CatalogFilterForm filters={{ sort: "price_asc", pageSize: 12 }} />
      </details>
    </section>
  );
}
