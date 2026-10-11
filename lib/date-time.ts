export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatCalendarDateInTimeZone(
  date: Date,
  timeZone: string,
): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Cannot format an invalid date.");
  }

  const parts = new Map(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      calendar: "gregory",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  const year = parts.get("year");
  const month = parts.get("month");
  const day = parts.get("day");

  if (!year || !month || !day) {
    throw new RangeError("Could not format the calendar date.");
  }

  return `${year}-${month}-${day}`;
}
