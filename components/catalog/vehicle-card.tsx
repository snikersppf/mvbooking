import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import Link from "next/link";
import type { CatalogListItem } from "@/server/services/catalog/types";
import styles from "./catalog.module.css";

type VehicleCardProps = Readonly<{
  vehicle: CatalogListItem;
}>;

export async function VehicleCard({ vehicle }: VehicleCardProps) {
  const t = await getTranslations();
  return (
    <Card as="article" className={`${styles.vehicleCard} vehicle-card`}>
      <div className={styles.vehicleMedia}>
        <p className={styles.category}>{t(vehicle.category)}</p>
        {vehicle.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehicle.image.url} alt={t(vehicle.image.alt)} width="640" height="360" />
        ) : (
          <div className="vehicle-image-placeholder">{t("No image")}</div>
        )}
      </div>
      <div className={styles.vehicleContent}>
        <h3>
          <Link href={`/vehicles/${vehicle.slug}`}>
            {vehicle.brand} {vehicle.model}
          </Link>{" "}
          <span>{vehicle.year}</span>
        </h3>
        <dl className={styles.vehicleSpecs}>
          <div>
            <dt><span className={styles.seatsIcon} aria-hidden="true" /><span className={styles.srOnly}>{t("Seats")}</span></dt>
            <dd>{vehicle.seats} {t(" мест")}</dd>
          </div>
          <div>
            <dt><span className={styles.gearIcon} aria-hidden="true" /><span className={styles.srOnly}>{t("Transmission")}</span></dt>
            <dd>{t(vehicle.transmission)}</dd>
          </div>
          <div>
            <dt><span className={styles.driveIcon} aria-hidden="true" /><span className={styles.srOnly}>{t("Drive")}</span></dt>
            <dd>{t(vehicle.drive)}</dd>
          </div>
        </dl>
        <p className={styles.vehicleLocation}><span className={styles.srOnly}>{t("Location: ")}</span>{t(vehicle.location)}</p>
        <p className={styles.vehiclePrice}>
          <strong>{vehicle.pricePerDay} {t(vehicle.currency)}</strong><span>{t("/ day")}</span>
        </p>
        {vehicle.pricingPeriodDays === null ? (
          <p className={styles.priceNote}>{t("Lowest daily rate.")}</p>
        ) : (
          <p className={styles.priceNote}>{t("Rate for the selected period.")}</p>
        )}
        <div className={styles.vehicleActions}>
          <span className={styles.available}><span aria-hidden="true" />{t("Доступен")}</span>
          <ButtonLink href={`/vehicles/${vehicle.slug}`} className={`button-secondary ${styles.detailButton}`}>
            {t("Подробнее ")}<span aria-hidden="true">→</span>
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
