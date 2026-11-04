"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { DateRangePicker } from "@/components/ui/date-picker";
import type { CalendarRange } from "@/lib/date-picker";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { bookingLocalDateTimeToIso } from "@/lib/booking-calendar";
import styles from "./catalog-date-input.module.css";

function localParts(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return { date: "", time: "10:00" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_CONFIG.displayTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function CatalogDateRange({ idPrefix, className, startDate, endDate }: Readonly<{ idPrefix: string; className?: string; startDate?: string; endDate?: string }>) {
  const { t } = useLanguage();
  const [instants, setInstants] = useState({ start: startDate ?? "", end: endDate ?? "" });
  const [times, setTimes] = useState({ start: localParts(startDate ?? "").time, end: localParts(endDate ?? "").time });
  const dates = { start: localParts(instants.start).date, end: localParts(instants.end).date };
  function change(range: CalendarRange) {
    setInstants({
      start: range.start === dates.start ? instants.start : range.start ? bookingLocalDateTimeToIso(`${range.start}T${times.start}`, BOOKING_CONFIG.displayTimeZone) : "",
      end: range.end === dates.end ? instants.end : range.end ? bookingLocalDateTimeToIso(`${range.end}T${times.end}`, BOOKING_CONFIG.displayTimeZone) : "",
    });
  }
  const timeInput = (part: "start" | "end") => <input className={styles.time} type="time"
    aria-label={t(part === "start" ? "Pickup time" : "Return time")} title={BOOKING_CONFIG.displayTimeZone}
    value={times[part]} onChange={(event) => {
      const next = event.target.value;
      if (!next) return;
      setTimes({ ...times, [part]: next });
      if (dates[part]) setInstants({ ...instants, [part]: bookingLocalDateTimeToIso(`${dates[part]}T${next}`, BOOKING_CONFIG.displayTimeZone) });
    }} />;
  return <div className={className}>
    <DateRangePicker idPrefix={idPrefix} value={dates} onChange={change} withTime
      timeZone={BOOKING_CONFIG.displayTimeZone} startTime={timeInput("start")} endTime={timeInput("end")} />
    <input type="hidden" name="startDate" value={instants.start} />
    <input type="hidden" name="endDate" value={instants.end} />
  </div>;
}
