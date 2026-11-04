import { getTranslations } from "@/lib/i18n/server";
import { VehicleIcon, type VehicleIconName } from "@/components/ui/vehicle-icon";
import type { CatalogVehicleDetail } from "@/server/services/catalog/types";
import styles from "./vehicle-features.module.css";

export async function VehicleFeatures({ vehicle }: Readonly<{ vehicle: CatalogVehicleDetail }>) {
  const t = await getTranslations();
  const features: ReadonlyArray<readonly [VehicleIconName, string, string | number]> = [
    ["calendar", "Year", vehicle.year],
    ["transmission", "Transmission", t(vehicle.transmission)],
    ["drive", "Drive", t(vehicle.drive)],
    ["fuel", "Fuel", t(vehicle.fuel)],
    ["seats", "Seats", vehicle.seats],
    ["car", "Category", t(vehicle.category)],
    ["engine", "Engine", t(vehicle.engine ?? "Not specified")],
    ["location", "Location", t(vehicle.location)],
  ];
  return <dl className={styles.features}>
    {features.map(([icon, label, value]) => <div key={label}>
      <dt><VehicleIcon name={icon} /><span>{t(label)}</span></dt>
      <dd>{value}</dd>
    </div>)}
  </dl>;
}
