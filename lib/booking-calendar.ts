const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

type CalendarParts = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}>;

function parseLocalDateTime(value: string): CalendarParts | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "00"] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };

  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > 31 ||
    parts.hour > 23 ||
    parts.minute > 59 ||
    parts.second > 59
  ) {
    return null;
  }

  return parts;
}

function calendarPartsToUtcMilliseconds(parts: CalendarParts): number {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, parts.second, 0);
  return date.getTime();
}

function calendarPartsInTimeZone(date: Date, timeZone: string): CalendarParts {
  const values: Record<string, string> = {};
  for (const { type, value } of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)) {
    values[type] = value;
  }

  const read = (type: string): number => {
    const value = values[type];
    if (value === undefined) {
      throw new RangeError("Could not read " + type + " in " + timeZone + ".");
    }
    return Number(value);
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function sameCalendarParts(first: CalendarParts, second: CalendarParts): boolean {
  return (
    first.year === second.year &&
    first.month === second.month &&
    first.day === second.day &&
    first.hour === second.hour &&
    first.minute === second.minute &&
    first.second === second.second
  );
}

/**
 * Interprets a datetime-local value in the configured booking time zone and
 * returns an ISO instant. The time-zone offset is obtained from Intl rather
 * than being fixed in the browser bundle.
 */
export function bookingLocalDateTimeToIso(
  value: string,
  timeZone: string,
): string {
  const requested = parseLocalDateTime(value.trim());
  if (!requested) throw new RangeError("Enter a valid local date and time.");

  const requestedAsUtc = calendarPartsToUtcMilliseconds(requested);
  let instantMilliseconds = requestedAsUtc;

  // A second pass handles zones whose offset differs at the guessed instant.
  for (let pass = 0; pass < 3; pass += 1) {
    const represented = calendarPartsInTimeZone(
      new Date(instantMilliseconds),
      timeZone,
    );
    const offset =
      calendarPartsToUtcMilliseconds(represented) - instantMilliseconds;
    const nextInstant = requestedAsUtc - offset;
    if (nextInstant === instantMilliseconds) break;
    instantMilliseconds = nextInstant;
  }

  const instant = new Date(instantMilliseconds);
  if (
    Number.isNaN(instant.getTime()) ||
    !sameCalendarParts(calendarPartsInTimeZone(instant, timeZone), requested)
  ) {
    throw new RangeError("This local date and time does not exist.");
  }

  return instant.toISOString();
}

export function isBookingLocalDateTime(
  value: string,
  timeZone: string,
): boolean {
  try {
    bookingLocalDateTimeToIso(value, timeZone);
    return true;
  } catch {
    return false;
  }
}
