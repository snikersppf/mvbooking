import { getTranslations } from "@/lib/i18n/server";
import { Card } from "@/components/ui/card";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  emptyAdminVehicleFormValues,
} from "@/components/admin/form-schemas";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";

export default async function NewAdminVehiclePage() {
  const t = await getTranslations();
  const actor = await requireAdminPageRole(
    MANAGER_ADMIN_ROLES,
    "/admin/vehicles/new",
  );

  return (
    <AdminPageShell
      role={actor.role}
      title={t("Create vehicle")}
      description={t("Create the vehicle first, then add pricing and images.")}
    >
      <Card as="section" className="admin-panel" aria-labelledby="vehicle-details-title">
        <h2 id="vehicle-details-title">{t("Vehicle details")}</h2>
        <VehicleForm
          mode="create"
          defaultValues={emptyAdminVehicleFormValues()}
        />
      </Card>
    </AdminPageShell>
  );
}

