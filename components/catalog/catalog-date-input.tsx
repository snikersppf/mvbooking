"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { bookingLocalDateTimeToIso } from "@/lib/booking-calendar";

function localDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BOOKING_CONFIG.displayTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function CatalogDateInput({ name, defaultValue }: Readonly<{ name: string; defaultValue?: string }>) {
  const [value, setValue] = useState(defaultValue ?? "");
  const date = localDate(value);
  return <>
    <Input type="date" value={date} onChange={(event) => setValue(event.target.value ? bookingLocalDateTimeToIso(`${event.target.value}T10:00`, BOOKING_CONFIG.displayTimeZone) : "")} />
    <input type="hidden" name={name} value={value} />
  </>;
}
