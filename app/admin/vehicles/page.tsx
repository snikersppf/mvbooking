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
      title="Vehicles"
      description="Manage public catalog records and availability status."
      actions={
        <ButtonLink className="button" href="/admin/vehicles/new">
          Create vehicle
        </ButtonLink>
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
          The vehicle filters are invalid.
        </p>
      ) : vehicles.items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Status</th>
                <th>Location</th>
                <th>Pricing</th>
                <th>Action</th>
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
                  <td>{formatAdminEnum(vehicle.category)}</td>
                  <td>{formatAdminEnum(vehicle.status)}</td>
                  <td>{vehicle.location}</td>
                  <td>{vehicle.pricingRules.length} tiers</td>
                  <td>
                    <Link href={`/admin/vehicles/${encodeURIComponent(vehicle.id)}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No vehicles match these filters.</EmptyState>
      )}

      {vehicles ? (
        <Pagination
          ariaLabel="Vehicle pages"
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

