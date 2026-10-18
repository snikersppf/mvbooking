export function formatBookingDateTime(
  value: string,
  timeZone: string,
  locale: "ru" | "en" = "en",
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Cannot format an invalid booking date.");
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatBookingStatus(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function canCustomerCancelBooking(
  status: string,
  paymentStatus: string,
): boolean {
  return status === "PENDING" && paymentStatus === "UNPAID";
}

export function accountBookingsPageHref(page: number): string {
  return "/account/bookings?" + new URLSearchParams({ page: String(page) });
}
