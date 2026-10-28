import { getTranslations } from "@/lib/i18n/server";
import Form from "next/form";
import { CatalogDateInput } from "@/components/catalog/catalog-date-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import styles from "./frame-component.module.css";

export default async function RentalSearch() {
  const t = await getTranslations();
  return <section className={styles.rentalSearchBarWrapper} aria-label={t("Поиск автомобиля")}>
    <Form action="/vehicles" className={styles.rentalSearchBar}>
      <label><span className={styles.calendarIcon} aria-hidden="true" /><span>{t("Pickup date")}<CatalogDateInput name="startDate" /></span></label>
      <label><span className={styles.calendarIcon} aria-hidden="true" /><span>{t("Return date")}<CatalogDateInput name="endDate" /></span></label>
      <label><span className={styles.carIcon} aria-hidden="true" /><span>{t("Category")}<Select name="category" defaultValue="">
        <option value="">{t("All vehicles")}</option>{["ECONOMY", "COMPACT", "SUV", "VAN", "PREMIUM"].map((category) => <option key={category} value={category}>{t(({ ECONOMY: "Economy", COMPACT: "Compact", SUV: "SUV", VAN: "Van", PREMIUM: "Premium" } as Record<string, string>)[category])}</option>)}
      </Select></span></label>
      <Button type="submit">{t("Найти автомобиль ")}<span aria-hidden="true">→</span></Button>
    </Form>
  </section>;
}
