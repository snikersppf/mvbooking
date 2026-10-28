export const LEAD_STATUSES = ["NEW", "IN_PROGRESS", "REJECTED", "CANCELLED_BY_CUSTOMER", "NO_SHOW", "COMPLETED"] as const;
export const TERMINAL_LEAD_STATUSES = ["REJECTED", "CANCELLED_BY_CUSTOMER", "NO_SHOW", "COMPLETED"] as const;
export const ARCHIVED_LEAD_STATUSES = [...TERMINAL_LEAD_STATUSES, "CLOSED"] as const;
export const EDITABLE_LEAD_STATUSES = ["IN_PROGRESS", ...TERMINAL_LEAD_STATUSES] as const;
export function leadStatusLabel(status: string): string {
  return ({ NEW: "New", IN_PROGRESS: "Accepted for processing", REJECTED: "Declined",
    CANCELLED_BY_CUSTOMER: "Cancelled by customer", NO_SHOW: "Customer did not arrive", COMPLETED: "Fulfilled", CLOSED: "Closed (legacy)",
  } as Record<string, string>)[status] ?? status;
}
