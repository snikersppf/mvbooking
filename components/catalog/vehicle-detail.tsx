import type { CatalogVehicleDetail } from "@/server/services/catalog/types";

type VehicleDetailProps = Readonly<{
  vehicle: CatalogVehicleDetail;
}>;

function tariffRange(minDays: number, maxDays: number | null): string {
  return maxDays === null ? `${minDays}+ days` : `${minDays}–${maxDays} days`;
}

export function VehicleDetail({ vehicle }: VehicleDetailProps) {
  return (
    <>
      {vehicle.images.length > 0 ? (
        <div className="vehicle-gallery">
          {vehicle.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image.id} src={image.url} alt={image.alt} width="960" height="540" />
          ))}
        </div>
      ) : (
        <div className="vehicle-detail-placeholder">No images available</div>
      )}

      <section className="vehicle-detail-grid" aria-label="Vehicle details">
        <div>
          <h2>Specifications</h2>
          <dl className="vehicle-specifications">
            <div><dt>Year</dt><dd>{vehicle.year}</dd></div>
            <div><dt>Category</dt><dd>{vehicle.category}</dd></div>
            <div><dt>Seats</dt><dd>{vehicle.seats}</dd></div>
            <div><dt>Transmission</dt><dd>{vehicle.transmission}</dd></div>
            <div><dt>Fuel</dt><dd>{vehicle.fuel}</dd></div>
            <div><dt>Drive</dt><dd>{vehicle.drive}</dd></div>
            <div><dt>Engine</dt><dd>{vehicle.engine ?? "Not specified"}</dd></div>
            <div><dt>Location</dt><dd>{vehicle.location}</dd></div>
            <div><dt>Insurance</dt><dd>{vehicle.insuranceIncluded ? "Included" : "Not included"}</dd></div>
            <div><dt>Deposit</dt><dd>{vehicle.depositAmount} {vehicle.currency}</dd></div>
          </dl>
        </div>
        <div>
          <h2>Daily rates</h2>
          <table className="pricing-table">
            <thead><tr><th>Period</th><th>Price per day</th></tr></thead>
            <tbody>
              {vehicle.pricingRules.map((rule) => (
                <tr key={rule.id}>
                  <td>{tariffRange(rule.minDays, rule.maxDays)}</td>
                  <td>{rule.pricePerDay} {rule.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
