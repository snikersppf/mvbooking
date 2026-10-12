import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { VehicleDetail } from "@/components/catalog/vehicle-detail";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { getCatalogVehicleBySlug } from "@/server/services/catalog/get-vehicle";

type VehiclePageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { slug } = await params;
  const vehicle = await getCatalogVehicleBySlug(slug);
  if (!vehicle) notFound();

  return (
    <main className="vehicle-page-shell">
      <nav className="vehicle-breadcrumb" aria-label="Breadcrumb">
        <Link href="/vehicles">Vehicle catalog</Link>
      </nav>
      <header className="vehicle-page-header">
        <p className="eyebrow">{vehicle.category}</p>
        <h1>
          {vehicle.brand} {vehicle.model}
        </h1>
        {vehicle.description ? <p>{vehicle.description}</p> : null}
      </header>

      <VehicleDetail vehicle={vehicle} />

      <section className="availability-panel" aria-labelledby="booking-title">
        <h2 id="booking-title">Availability and booking</h2>
        <BookingForm
          vehicleId={vehicle.id}
          vehicleSlug={vehicle.slug}
          defaultLocation={vehicle.location}
          displayTimeZone={BOOKING_CONFIG.displayTimeZone}
          maxDurationDays={BOOKING_CONFIG.maxDurationDays}
        />
      </section>
    </main>
  );
}
