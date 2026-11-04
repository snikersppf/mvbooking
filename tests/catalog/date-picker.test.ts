import { describe, expect, it } from "vitest";
import { calendarMonthDays, selectCalendarRange, shiftCalendarDate, shiftCalendarMonth } from "@/lib/date-picker";

describe("rental calendar", () => {
  it("selects pickup then return, restarting the range when a date before pickup is chosen", () => {
    const first = selectCalendarRange({ start: "", end: "" }, "start", "2026-11-22");
    expect(first).toEqual({ range: { start: "2026-11-22", end: "" }, field: "end" });
    const second = selectCalendarRange(first.range, first.field, "2026-12-14");
    expect(second.range).toEqual({ start: "2026-11-22", end: "2026-12-14" });
    expect(selectCalendarRange(second.range, "end", "2026-11-10")).toEqual({ range: { start: "2026-11-10", end: "" }, field: "end" });
    expect(selectCalendarRange(second.range, "start", "2026-12-20").range).toEqual({ start: "2026-12-20", end: "" });
    expect(selectCalendarRange({ start: "", end: "" }, "end", "2026-11-22").range).toEqual({ start: "2026-11-22", end: "" });
  });
  it("starts weeks on Monday and includes every real day once", () => {
    const november = calendarMonthDays("2026-11-01");
    expect(november.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(november[6]).toBe("2026-11-01");
    expect(november.filter(Boolean)).toHaveLength(30);
    expect(new Set(november.filter(Boolean)).size).toBe(30);
    expect(november.length % 7).toBe(0);
  });
  it("handles leap years and month/year navigation without date overflow", () => {
    expect(calendarMonthDays("2028-02-01").filter(Boolean)).toHaveLength(29);
    expect(calendarMonthDays("2027-02-01").filter(Boolean)).toHaveLength(28);
    expect(shiftCalendarMonth("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftCalendarMonth("2027-01-31", -1)).toBe("2026-12-01");
    expect(shiftCalendarDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftCalendarDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});
