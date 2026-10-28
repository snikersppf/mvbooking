export type AdminNavigationItem = Readonly<{
  href: string;
  label: string;
}>;

export type AdminDashboardItem = AdminNavigationItem &
  Readonly<{ description: string; actionLabel: string }>;

const NAVIGATION_ITEMS: readonly AdminNavigationItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/bookings", label: "Bookings" },
];

export function adminNavigationItems(): readonly AdminNavigationItem[] {
  return NAVIGATION_ITEMS;
}

const DASHBOARD_ITEMS: readonly AdminDashboardItem[] = [
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

export function adminDashboardItems(): readonly AdminDashboardItem[] {
  return DASHBOARD_ITEMS;
}
