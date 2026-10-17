import { ADMIN_PAGE_SIZE } from "@/lib/admin-input";

export type RawAdminSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function firstAdminSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageInput(searchParams: RawAdminSearchParams) {
  return {
    page: firstAdminSearchParam(searchParams.page),
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export function adminVehicleListInput(
  searchParams: RawAdminSearchParams,
) {
  return {
    ...pageInput(searchParams),
    status: firstAdminSearchParam(searchParams.status),
    category: firstAdminSearchParam(searchParams.category),
  };
}

export function adminBookingListInput(
  searchParams: RawAdminSearchParams,
) {
  return {
    ...pageInput(searchParams),
    status: firstAdminSearchParam(searchParams.status),
  };
}

export function adminUserListInput(searchParams: RawAdminSearchParams) {
  return {
    ...pageInput(searchParams),
    role: firstAdminSearchParam(searchParams.role),
    status: firstAdminSearchParam(searchParams.status),
  };
}

export function adminAuditLogListInput(
  searchParams: RawAdminSearchParams,
) {
  return {
    ...pageInput(searchParams),
    action: firstAdminSearchParam(searchParams.action),
    entity: firstAdminSearchParam(searchParams.entity),
  };
}

export function adminListPageHref(
  pathname: string,
  filters: Readonly<Record<string, string | undefined>>,
  page: number,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) searchParams.set(key, value);
  }
  if (page > 1) searchParams.set("page", String(page));
  const query = searchParams.toString();
  return query ? pathname + "?" + query : pathname;
}

