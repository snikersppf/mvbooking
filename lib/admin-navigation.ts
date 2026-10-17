export type AdminNavigationItem = Readonly<{
  href: string;
  label: string;
}>;

export type AdminDashboardItem = AdminNavigationItem &
  Readonly<{ description: string; actionLabel: string }>;

const MANAGER_ITEMS: readonly AdminNavigationItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/bookings", label: "Bookings" },
];

const ADMIN_ITEMS: readonly AdminNavigationItem[] = [
  ...MANAGER_ITEMS,
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit-logs", label: "Audit logs" },
];

export function adminNavigationItems(
  role: string,
): readonly AdminNavigationItem[] {
  return role === "ADMIN" ? ADMIN_ITEMS : MANAGER_ITEMS;
}

const MANAGER_DASHBOARD_ITEMS: readonly AdminDashboardItem[] = [
  {
    href: "/admin/vehicles",
    label: "Vehicles",
    description: "Manage vehicle details, pricing tiers, status, and images.",
    actionLabel: "Open vehicles",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    description: "Review requests and apply allowed status transitions.",
    actionLabel: "Open bookings",
  },
];

const ADMIN_DASHBOARD_ITEMS: readonly AdminDashboardItem[] = [
  ...MANAGER_DASHBOARD_ITEMS,
  {
    href: "/admin/users",
    label: "Users",
    description: "Manage roles and account status.",
    actionLabel: "Open users",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit logs",
    description: "Review administrative changes.",
    actionLabel: "Open audit logs",
  },
];

export function adminDashboardItems(
  role: string,
): readonly AdminDashboardItem[] {
  return role === "ADMIN" ? ADMIN_DASHBOARD_ITEMS : MANAGER_DASHBOARD_ITEMS;
}
