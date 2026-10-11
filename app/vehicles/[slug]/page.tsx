import Link from "next/link";
import { notFound } from "next/navigation";
import { ZodError } from "zod";
import { AvailabilityForm } from "@/components/catalog/availability-form";
import { AvailabilityResult } from "@/components/catalog/availability-result";
import { VehicleDetail } from "@/components/catalog/vehicle-detail";
import { checkVehicleAvailability } from "@/server/services/availability/check-vehicle";
import type { VehicleAvailabilityResult } from "@/server/services/availability/check-vehicle";
import { BookingRuleError } from "@/server/services/booking/errors";
import { getCatalogVehicleBySlug } from "@/server/services/catalog/get-vehicle";

type RawSearchParams = Record<string, string | string[] | undefined>;

type VehiclePageProps = Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}>;

type AvailabilityView = Readonly<{
  result: VehicleAvailabilityResult | null;
  validationError: boolean;
  startDate: string;
  endDate: string;
}>;

function formValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function loadAvailability(
  vehicleId: string,
  searchParams: RawSearchParams,
): Promise<AvailabilityView> {
  const startDate = formValue(searchParams.startDate);
  const endDate = formValue(searchParams.endDate);
  const hasAvailabilityQuery =
    searchParams.startDate !== undefined || searchParams.endDate !== undefined;

  if (!hasAvailabilityQuery) {
    return { result: null, validationError: false, startDate, endDate };
  }

  try {
    return {
      result: await checkVehicleAvailability({
        vehicleId,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
      }),
      validationError: false,
      startDate,
      endDate,
    };
  } catch (error) {
    if (error instanceof ZodError || error instanceof BookingRuleError) {
      return { result: null, validationError: true, startDate, endDate };
    }
    throw error;
  }
}

export default async function VehiclePage({
  params,
  searchParams,
}: VehiclePageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const vehicle = await getCatalogVehicleBySlug(slug);
  if (!vehicle) notFound();

  const availability = await loadAvailability(vehicle.id, query);

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

      <section className="availability-panel" aria-labelledby="availability-title">
        <h2 id="availability-title">Availability and quote</h2>
        <AvailabilityForm
          action={`/vehicles/${vehicle.slug}`}
          startDate={availability.startDate}
          endDate={availability.endDate}
        />
        <AvailabilityResult
          result={availability.result}
          validationError={availability.validationError}
        />
      </section>
    </main>
  );
}
