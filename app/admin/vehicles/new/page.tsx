import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  emptyAdminVehicleFormValues,
} from "@/components/admin/form-schemas";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";

export default async function NewAdminVehiclePage() {
  const actor = await requireAdminPageRole(
    MANAGER_ADMIN_ROLES,
    "/admin/vehicles/new",
  );

  return (
    <AdminPageShell
      role={actor.role}
      title="Create vehicle"
      description="Create the vehicle first, then add pricing and images."
    >
      <section className="admin-panel" aria-labelledby="vehicle-details-title">
        <h2 id="vehicle-details-title">Vehicle details</h2>
        <VehicleForm
          mode="create"
          defaultValues={emptyAdminVehicleFormValues()}
        />
      </section>
    </AdminPageShell>
  );
}

