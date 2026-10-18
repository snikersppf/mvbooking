import { Card } from "@/components/ui/card";
import { ZodError } from "zod";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminListFilterForm } from "@/components/admin/list-filter-form";
import {
  AdminUserRoleForm,
  AdminUserStatusForm,
} from "@/components/admin/user-access-forms";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { ADMIN_USER_ROLES, ADMIN_USER_STATUSES } from "@/lib/admin-input";
import {
  adminListPageHref,
  adminUserListInput,
  firstAdminSearchParam,
  type RawAdminSearchParams,
} from "@/lib/admin-pages";
import { formatAdminDateTime, formatAdminEnum } from "@/lib/admin-view";
import { requireAdminPageRole } from "@/server/auth/admin-page";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { ADMIN_ONLY_ROLES } from "@/server/services/admin/authorization";
import { listAdminUsers } from "@/server/services/admin/users";

type AdminUsersPageProps = Readonly<{
  searchParams: Promise<RawAdminSearchParams>;
}>;

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const actor = await requireAdminPageRole(
    ADMIN_ONLY_ROLES,
    "/admin/users",
    "/admin",
  );
  const rawSearchParams = await searchParams;
  const listInput = adminUserListInput(rawSearchParams);
  let users;
  try {
    users = await listAdminUsers(listInput);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;
    users = null;
  }
  const role = firstAdminSearchParam(rawSearchParams.role);
  const status = firstAdminSearchParam(rawSearchParams.status);
  const filters = { role, status };

  return (
    <AdminPageShell
      role={actor.role}
      title="Users"
      description="Role and status changes revoke existing sessions."
    >
      <AdminListFilterForm
        action="/admin/users"
        fields={[
          {
            name: "role",
            label: "Role",
            value: role,
            options: ADMIN_USER_ROLES.map((value) => ({
              value,
              label: formatAdminEnum(value),
            })),
          },
          {
            name: "status",
            label: "Status",
            value: status,
            options: ADMIN_USER_STATUSES.map((value) => ({
              value,
              label: formatAdminEnum(value),
            })),
          },
        ]}
      />

      {!users ? (
        <p className="status-message status-error" role="alert">
          The user filters are invalid.
        </p>
      ) : users.items.length > 0 ? (
        <div className="admin-user-list">
          {users.items.map((user) => (
            <Card as="article" key={user.id} className="admin-panel admin-user-card">
              <header>
                <div>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                </div>
                <p className="muted-text">
                  Created {formatAdminDateTime(user.createdAt, BOOKING_CONFIG.displayTimeZone)}
                </p>
              </header>
              <div className="admin-user-actions">
                <AdminUserRoleForm key={`${user.id}:${user.role}`} userId={user.id} role={user.role} />
                <AdminUserStatusForm key={`${user.id}:${user.status}`} userId={user.id} status={user.status} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState>No users match these filters.</EmptyState>
      )}

      {users ? (
        <Pagination
          ariaLabel="User pages"
          page={users.page}
          totalPages={users.totalPages}
          previousHref={
            users.hasPreviousPage
              ? adminListPageHref("/admin/users", filters, users.page - 1)
              : null
          }
          nextHref={
            users.hasNextPage
              ? adminListPageHref("/admin/users", filters, users.page + 1)
              : null
          }
        />
      ) : null}
    </AdminPageShell>
  );
}

