import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import Link from "next/link";
import type { CatalogListItem } from "@/server/services/catalog/types";
import styles from "./catalog.module.css";

type VehicleCardProps = Readonly<{
  vehicle: CatalogListItem;
}>;

export function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <Card as="article" className={`${styles.vehicleCard} vehicle-card`}>
      <div className={styles.vehicleMedia}>
        <p className={styles.category}>{vehicle.category}</p>
        {vehicle.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vehicle.image.url} alt={vehicle.image.alt} width="640" height="360" />
        ) : (
          <div className="vehicle-image-placeholder">No image</div>
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
            <dt><span className={styles.seatsIcon} aria-hidden="true" /><span className={styles.srOnly}>Seats</span></dt>
            <dd>{vehicle.seats} мест</dd>
          </div>
          <div>
            <dt><span className={styles.gearIcon} aria-hidden="true" /><span className={styles.srOnly}>Transmission</span></dt>
            <dd>{vehicle.transmission}</dd>
          </div>
          <div>
            <dt><span className={styles.driveIcon} aria-hidden="true" /><span className={styles.srOnly}>Drive</span></dt>
            <dd>{vehicle.drive}</dd>
          </div>
        </dl>
        <p className={styles.vehicleLocation}><span className={styles.srOnly}>Location: </span>{vehicle.location}</p>
        <p className={styles.vehiclePrice}>
          <strong>{vehicle.pricePerDay} {vehicle.currency}</strong><span>/ day</span>
        </p>
        {vehicle.pricingPeriodDays === null ? (
          <p className={styles.priceNote}>Lowest daily rate.</p>
        ) : (
          <p className={styles.priceNote}>Rate for the selected period.</p>
        )}
        <div className={styles.vehicleActions}>
          <span className={styles.available}><span aria-hidden="true" />Доступен</span>
          <ButtonLink href={`/vehicles/${vehicle.slug}`} className={`button-secondary ${styles.detailButton}`}>
            Подробнее <span aria-hidden="true">→</span>
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
