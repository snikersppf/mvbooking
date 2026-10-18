import { getTranslations } from "@/lib/i18n/server";
import { ButtonLink } from "@/components/ui/button-link";
import Link from "next/link";
import { ZodError } from "zod";
import { AdminListFilterForm } from "@/components/admin/list-filter-form";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import {
  ADMIN_VEHICLE_CATEGORIES,
  ADMIN_VEHICLE_STATUSES,
} from "@/lib/admin-input";
import {
  adminListPageHref,
  adminVehicleListInput,
  firstAdminSearchParam,
  type RawAdminSearchParams,
} from "@/lib/admin-pages";
import { formatAdminEnum } from "@/lib/admin-view";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { MANAGER_ADMIN_ROLES } from "@/server/services/admin/authorization";
import {
  listAdminVehicles,
} from "@/server/services/admin/vehicles";

type AdminVehiclesPageProps = Readonly<{
  searchParams: Promise<RawAdminSearchParams>;
}>;

export default async function AdminVehiclesPage({
  searchParams,
}: AdminVehiclesPageProps) {
  const t = await getTranslations();
  const actor = await requireAdminPageRole(
    MANAGER_ADMIN_ROLES,
    "/admin/vehicles",
  );
  const rawSearchParams = await searchParams;
  const listInput = adminVehicleListInput(rawSearchParams);
  let vehicles;
  try {
    vehicles = await listAdminVehicles(listInput);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    vehicles = null;
  }

  const status = firstAdminSearchParam(rawSearchParams.status);
  const category = firstAdminSearchParam(rawSearchParams.category);
  const filters = { status, category };

  return (
    <AdminPageShell
      role={actor.role}
      title={t("Vehicles")}
      description={t("Manage public catalog records and availability status.")}
      actions={
        <ButtonLink className="button" href="/admin/vehicles/new">
          {t("Create vehicle")}</ButtonLink>
      }
    >
      <AdminListFilterForm
        action="/admin/vehicles"
        fields={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: ADMIN_VEHICLE_STATUSES.map((value) => ({
              value,
              label: formatAdminEnum(value),
            })),
          },
          {
            name: "category",
            label: "Category",
            value: category,
            options: ADMIN_VEHICLE_CATEGORIES.map((value) => ({
              value,
              label: formatAdminEnum(value),
            })),
          },
        ]}
      />

      {!vehicles ? (
        <p className="status-message status-error" role="alert">
          {t("The vehicle filters are invalid.")}</p>
      ) : vehicles.items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Vehicle")}</th>
                <th>{t("Category")}</th>
                <th>{t("Status")}</th>
                <th>{t("Location")}</th>
                <th>{t("Pricing")}</th>
                <th>{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.items.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <strong>
                      {vehicle.brand} {vehicle.model}
                    </strong>
                    <br />
                    <span className="muted-text">{vehicle.slug}</span>
                  </td>
                  <td>{t(formatAdminEnum(vehicle.category))}</td>
                  <td>{t(formatAdminEnum(vehicle.status))}</td>
                  <td>{t(vehicle.location)}</td>
                  <td>{vehicle.pricingRules.length} {t(" tiers")}</td>
                  <td>
                    <Link href={`/admin/vehicles/${encodeURIComponent(vehicle.id)}`}>
                      {t("Edit")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>{t("No vehicles match these filters.")}</EmptyState>
      )}

      {vehicles ? (
        <Pagination
          ariaLabel={t("Vehicle pages")}
          page={vehicles.page}
          totalPages={vehicles.totalPages}
          previousHref={
            vehicles.hasPreviousPage
              ? adminListPageHref("/admin/vehicles", filters, vehicles.page - 1)
              : null
          }
          nextHref={
            vehicles.hasNextPage
              ? adminListPageHref("/admin/vehicles", filters, vehicles.page + 1)
              : null
          }
        />
      ) : null}
    </AdminPageShell>
  );
}

