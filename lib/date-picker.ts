/** Calendar arithmetic uses UTC so browser time zones cannot shift a day. */
export type CalendarRange = Readonly<{ start: string; end: string }>;
export type RangeField = "start" | "end";

export function selectCalendarRange(range: CalendarRange, field: RangeField, day: string): { range: CalendarRange; field: RangeField } {
  if (field === "start" || !range.start || day < range.start) {
    return { range: { start: day, end: "" }, field: "end" };
  }
  return { range: { start: range.start, end: day }, field: "end" };
}

export function calendarDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export function shiftCalendarDate(value: string, days: number): string {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function shiftCalendarMonth(value: string, months: number): string {
  const date = calendarDate(value.slice(0, 7) + "-01");
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function calendarMonthDays(month: string): (string | null)[] {
  const first = calendarDate(month.slice(0, 7) + "-01");
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const length = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length }, (_, index) => index < offset || index >= offset + count
    ? null : `${month.slice(0, 7)}-${String(index - offset + 1).padStart(2, "0")}`);
}
