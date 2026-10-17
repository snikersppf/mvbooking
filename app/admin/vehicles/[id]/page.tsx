import { VehicleStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ArchiveVehicleButton } from "@/components/admin/archive-vehicle-button";
import {
  adminImagesDtoToFormValues,
  adminPricingDtoToFormValues,
  adminVehicleDtoToFormValues,
} from "@/components/admin/form-schemas";
import { ImagesForm } from "@/components/admin/images-form";
import { PricingForm } from "@/components/admin/pricing-form";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import { getAdminVehicle } from "@/server/services/admin/vehicles";

type EditAdminVehiclePageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function EditAdminVehiclePage({
  params,
}: EditAdminVehiclePageProps) {
  const actor = await requireAdminPageRole(
    MANAGER_ADMIN_ROLES,
    "/admin/vehicles",
  );
  const { id } = await params;
  const vehicle = await getAdminVehicle(id);
  if (!vehicle) notFound();

  const isArchived = vehicle.status === VehicleStatus.ARCHIVED;
  const canArchive = actor.role === "ADMIN" && !isArchived;

  return (
    <AdminPageShell
      role={actor.role}
      title={`${vehicle.brand} ${vehicle.model}`}
      description={`Vehicle ID: ${vehicle.id}`}
      actions={canArchive ? <ArchiveVehicleButton vehicleId={vehicle.id} /> : undefined}
    >
      {isArchived ? (
        <p className="status-message">This vehicle is archived and read-only.</p>
      ) : (
        <>
          <section className="admin-panel" aria-labelledby="vehicle-details-title">
            <h2 id="vehicle-details-title">Vehicle details and status</h2>
            <VehicleForm
              mode="edit"
              vehicleId={vehicle.id}
              defaultValues={adminVehicleDtoToFormValues(vehicle)}
            />
          </section>
          <section className="admin-panel" aria-labelledby="pricing-title">
            <h2 id="pricing-title">Pricing tiers</h2>
            <PricingForm
              vehicleId={vehicle.id}
              defaultValues={adminPricingDtoToFormValues(vehicle.pricingRules)}
            />
          </section>
          <section className="admin-panel" aria-labelledby="images-title">
            <h2 id="images-title">Images</h2>
            <ImagesForm
              vehicleId={vehicle.id}
              defaultValues={adminImagesDtoToFormValues(vehicle.images)}
            />
          </section>
        </>
      )}
    </AdminPageShell>
  );
}

