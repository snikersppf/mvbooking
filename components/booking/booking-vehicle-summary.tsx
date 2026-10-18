import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CatalogVehicleDetail } from "@/server/services/catalog/types";
import styles from "./booking-page.module.css";

export async function BookingVehicleSummary({ vehicle }: Readonly<{ vehicle: CatalogVehicleDetail }>) {
  const t = await getTranslations();
  return (
    <div className={styles.vehicle}>
      <div className={styles.vehiclePhoto}>
        {vehicle.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehicle.images[0].url} alt={t(vehicle.images[0].alt)} width="960" height="540" />
        ) : (
          <div className={styles.photoPlaceholder}>{t("No images available")}</div>
        )}
        <Badge className={styles.vehicleCategory}>{t(vehicle.category)}</Badge>
      </div>
      <h2>{vehicle.brand} {vehicle.model} {vehicle.year}</h2>
      <dl className={styles.vehicleSpecs}>
        <div><dt className={styles.seats}>{t("Мест")}</dt><dd>{vehicle.seats}</dd></div>
        <div><dt className={styles.transmission}>{t("Коробка")}</dt><dd>{t(vehicle.transmission)}</dd></div>
        <div><dt className={styles.drive}>{t("Привод")}</dt><dd>{t(vehicle.drive)}</dd></div>
      </dl>
      <Link href={`/vehicles/${vehicle.slug}`}>{t("Посмотреть автомобиль →")}</Link>
      <section className={styles.rentalConditions} id="rental-conditions" aria-labelledby="booking-conditions-title">
        <h3 id="booking-conditions-title">{t("Условия аренды")}</h3>
        <dl>
          <div><dt>{t("Возвратный депозит")}</dt><dd>{vehicle.depositAmount} {t(vehicle.currency)}</dd></div>
          <div><dt>{t("Страховка")}</dt><dd>{vehicle.insuranceIncluded ? t("Included") : t("Not included")}</dd></div>
        </dl>
      </section>
    </div>
  );
}
