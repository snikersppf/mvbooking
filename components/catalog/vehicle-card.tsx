import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { CatalogListItem } from "@/server/services/catalog/types";

type VehicleCardProps = Readonly<{
  vehicle: CatalogListItem;
}>;

export function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <Card as="article" className="vehicle-card">
      {vehicle.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vehicle.image.url} alt={vehicle.image.alt} width="640" height="360" />
      ) : (
        <div className="vehicle-image-placeholder">No image</div>
      )}
      <div className="vehicle-card-content">
        <p className="eyebrow">{vehicle.category}</p>
        <h2>
          <Link href={`/vehicles/${vehicle.slug}`}>
            {vehicle.brand} {vehicle.model}
          </Link>
        </h2>
        <dl className="vehicle-summary">
          <div>
            <dt>Year</dt>
            <dd>{vehicle.year}</dd>
          </div>
          <div>
            <dt>Seats</dt>
            <dd>{vehicle.seats}</dd>
          </div>
          <div>
            <dt>Transmission</dt>
            <dd>{vehicle.transmission}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{vehicle.location}</dd>
          </div>
        </dl>
        <p className="vehicle-price">
          {vehicle.pricePerDay} {vehicle.currency} / day
        </p>
        {vehicle.pricingPeriodDays === null ? (
          <p className="muted-text">Lowest daily rate.</p>
        ) : (
          <p className="muted-text">Rate for the selected period.</p>
        )}
      </div>
    </Card>
  );
}
