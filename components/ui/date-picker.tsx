"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/components/i18n/language-provider";
import { calendarDate, calendarMonthDays, selectCalendarRange, shiftCalendarDate, shiftCalendarMonth, type CalendarRange, type RangeField } from "@/lib/date-picker";
import { BOOKING_CONFIG } from "@/server/config/booking";
import { VehicleIcon } from "./vehicle-icon";
import styles from "./date-picker.module.css";

type DateRangePickerProps = Readonly<{
  idPrefix?: string;
  className?: string;
  value: CalendarRange;
  onChange: (value: CalendarRange) => void;
  startName?: string;
  endName?: string;
  withTime?: boolean;
  startTime?: ReactNode;
  endTime?: ReactNode;
  timeZone?: string;
}>;

export function DateRangePicker({ idPrefix, className = "", value, onChange, startName, endName, withTime = false, startTime, endTime, timeZone }: DateRangePickerProps) {
  const generatedId = useId();
  const id = idPrefix ?? generatedId;
  const { locale, t } = useLanguage();
  const anchor = useRef<HTMLDivElement>(null);
  const startTrigger = useRef<HTMLButtonElement>(null);
  const endTrigger = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const initialFocus = useRef("");
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const [month, setMonth] = useState("");
  const [today, setToday] = useState("");
  const [field, setField] = useState<RangeField>("start");
  const [hoverDay, setHoverDay] = useState("");
  const [selection, setSelection] = useState(0);
  const [animateRange, setAnimateRange] = useState(false);
  const open = position !== null;
  const format = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(calendarDate(day));
  const dateLabel = (day: string) => day ? format(day, { day: "2-digit", month: "short", year: "numeric" }) : t("Choose date");
  const previewEnd = field === "end" && hoverDay >= value.start && value.start ? hoverDay || value.end : value.end;
  const startMs = value.start ? calendarDate(value.start).getTime() : 0;
  const rangeDays = previewEnd ? Math.max(1, Math.round((calendarDate(previewEnd).getTime() - startMs) / 86_400_000) + 1) : 1;
  const dayDuration = 500 / rangeDays;

  const calendarPosition = useCallback((): CSSProperties => {
    const rect = anchor.current!.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportWidth = viewport?.width ?? innerWidth;
    const viewportHeight = viewport?.height ?? innerHeight;
    const width = Math.min(viewportWidth - 24, viewportWidth <= 640 ? 344 : 680);
    const below = viewportTop + viewportHeight - rect.bottom - 20;
    const above = rect.top - viewportTop - 20;
    const putBelow = below >= 480 || below >= above;
    return {
      width, left: Math.max(viewportLeft + 12, Math.min(rect.left + rect.width / 2 - width / 2, viewportLeft + viewportWidth - width - 12)),
      ...(putBelow ? { top: Math.max(viewportTop + 12, rect.bottom + 8) } : { bottom: Math.max(innerHeight - viewportTop - viewportHeight + 12, innerHeight - rect.top + 8) }),
      maxHeight: Math.max(100, Math.min(viewportHeight - 24, putBelow ? below : above)),
    };
  }, []);

  function close(restoreFocus = false) {
    setPosition(null);
    setHoverDay("");
    if (restoreFocus) opener.current?.focus({ preventScroll: true });
  }

  function show(nextField: RangeField) {
    opener.current = nextField === "start" ? startTrigger.current : endTrigger.current;
    setField(nextField === "end" && !value.start ? "start" : nextField);
    setHoverDay("");
    if (open) return;
    // Both inputs share this anchor, so the popup never jumps between fields.
    const current = new Intl.DateTimeFormat("en-CA", { timeZone: BOOKING_CONFIG.displayTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    setToday(current);
    setMonth((value.start || current).slice(0, 7) + "-01");
    initialFocus.current = value.start || current;
    setAnimateRange(false);
    setPosition(calendarPosition());
  }

  useEffect(() => {
    if (!open) return;
    const active = panel.current;
    active?.querySelector<HTMLButtonElement>(`[data-date="${initialFocus.current}"]`)?.focus({ preventScroll: true });
    const outside = (event: Event) => {
      if (event.target instanceof Node && !active?.contains(event.target) && !anchor.current?.contains(event.target)) setPosition(null);
    };
    const reposition = (event: Event) => {
      if (event.target instanceof Node && active?.contains(event.target)) return;
      setPosition((current) => current ? calendarPosition() : null);
    };
    const userScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !active?.contains(event.target)) setPosition(null);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setPosition(null); opener.current?.focus({ preventScroll: true }); }
      else if (["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key) && event.target instanceof Node && !active?.contains(event.target)) setPosition(null);
    };
    const viewport = window.visualViewport;
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    viewport?.addEventListener("resize", reposition);
    viewport?.addEventListener("scroll", reposition);
    document.addEventListener("wheel", userScroll, { passive: true, capture: true });
    document.addEventListener("touchmove", userScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      viewport?.removeEventListener("resize", reposition);
      viewport?.removeEventListener("scroll", reposition);
      document.removeEventListener("wheel", userScroll, true);
      document.removeEventListener("touchmove", userScroll, true);
    };
  }, [open, calendarPosition]);

  function choose(day: string) {
    const next = selectCalendarRange(value, field, day);
    onChange(next.range);
    setField(next.field);
    setHoverDay("");
    setAnimateRange(Boolean(next.range.end));
    setSelection((version) => version + 1);
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const day = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-date]")?.dataset.date;
    if (!day) return;
    const weekday = (calendarDate(day).getUTCDay() + 6) % 7;
    const offset = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday } as Record<string, number>)[event.key];
    if (offset === undefined && event.key !== "PageUp" && event.key !== "PageDown") return;
    event.preventDefault();
    const target = offset === undefined ? shiftCalendarMonth(day, event.key === "PageUp" ? -1 : 1) : shiftCalendarDate(day, offset);
    const visibleDay = panel.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`);
    if (visibleDay?.getClientRects().length) { visibleDay.focus({ preventScroll: true }); return; }
    setMonth(target.slice(0, 7) + "-01");
    requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus({ preventScroll: true }));
  }

  return <div ref={anchor} className={`${styles.range} ${className}`} data-with-time={withTime}>
    <div className={styles.fields}>
      {(["start", "end"] as const).map((part) => <div className={styles.field} key={part}>
        <label htmlFor={`${id}-${part}-date`}>{t(withTime ? part === "start" ? "Pickup date and time" : "Return date and time" : part === "start" ? "Pickup date" : "Return date")}</label>
        <div className={styles.control}>
          <button id={`${id}-${part}-date`} ref={part === "start" ? startTrigger : endTrigger} type="button" className={styles.trigger}
            aria-label={t(part === "start" ? "Pickup date" : "Return date")} aria-haspopup="dialog"
            aria-expanded={open} aria-controls={open ? `${id}-calendar` : undefined}
            data-active={open && field === part} data-date-value={value[part]} onClick={() => show(part)}>
            <VehicleIcon name="calendar" size={20} />
            <span data-empty={!value[part]}>{dateLabel(value[part])}</span>
            <span className={styles.chevron} aria-hidden="true">⌄</span>
          </button>
          {part === "start" ? startTime : endTime}
        </div>
      </div>)}
    </div>
    {startName && <input type="hidden" name={startName} value={value.start} />}
    {endName && <input type="hidden" name={endName} value={value.end} />}
    {open && createPortal(<div ref={panel} id={`${id}-calendar`} role="dialog" aria-label={t("Choose dates")}
      className={styles.panel} data-range-complete={Boolean(value.start && value.end)} style={position} onKeyDown={moveFocus}>
      <div className={styles.toolbar}>
        <span aria-live="polite">{t(value.start && value.end ? "Rental dates selected" : field === "start" ? "Choose pickup date" : "Choose return date")}</span>
        <button type="button" aria-label={t("Close calendar")} onClick={() => close(true)}>×</button>
      </div>
      <div className={styles.selection}>
        {(["start", "end"] as const).map((part) => <button type="button" key={part} data-active={field === part}
          aria-label={t(part === "start" ? "Change pickup date" : "Change return date")}
          onClick={() => { setField(part === "end" && !value.start ? "start" : part); setHoverDay(""); }}>
          <span>{t(part === "start" ? "Pickup date" : "Return date")}</span><strong>{dateLabel(value[part])}</strong>
        </button>)}
      </div>
      <div className={styles.months} onMouseLeave={() => setHoverDay("")}>
        {[month, shiftCalendarMonth(month, 1)].map((displayMonth, index) => {
          const monthDays = calendarMonthDays(displayMonth);
          return <section className={styles.month} key={index} aria-label={format(displayMonth, { month: "long", year: "numeric" })}>
          <div className={styles.monthHeading}>
            <button type="button" className={styles.previous} aria-label={t("Previous month")} onClick={() => { setMonth(shiftCalendarMonth(month, -1)); setHoverDay(""); }}>‹</button>
            <h3 aria-live={index === 0 ? "polite" : "off"}>{format(displayMonth, { month: "long", year: "numeric" })}</h3>
            <button type="button" className={styles.next} aria-label={t("Next month")} onClick={() => { setMonth(shiftCalendarMonth(month, 1)); setHoverDay(""); }}>›</button>
          </div>
          <div className={styles.weekdays} aria-hidden="true">{Array.from({ length: 7 }, (_, day) => <span key={day}>{format(shiftCalendarDate("2026-11-02", day), { weekday: "short" })}</span>)}</div>
          <div className={styles.days}>
            {monthDays.map((day, cell) => {
              if (!day) return <span key={`empty-${cell}`} />;
              const selected = day === value.start || day === value.end;
              const inRange = Boolean(value.start && previewEnd && day >= value.start && day <= previewEnd);
              const week = monthDays.slice(Math.floor(cell / 7) * 7, Math.floor(cell / 7) * 7 + 7);
              const included = (candidate: string | null) => Boolean(candidate && value.start && previewEnd && candidate >= value.start && candidate <= previewEnd);
              const firstInRow = week.findIndex(included);
              const lastInRow = week.length - 1 - [...week].reverse().findIndex(included);
              const rowLength = Math.max(1, lastInRow - firstInRow + 1);
              // Each date finishes before the next starts, including across weeks/months.
              const delay = Math.max(0, Math.round((calendarDate(day).getTime() - startMs) / 86_400_000)) * dayDuration;
              return <button type="button" key={day} data-date={day} data-in-range={inRange}
                data-range-start={day === value.start} data-range-end={day === previewEnd}
                data-range-row-start={inRange && cell % 7 === firstInRow} data-range-row-end={inRange && cell % 7 === lastInRow}
                aria-label={format(day, { day: "numeric", month: "long", year: "numeric" })}
                aria-pressed={selected} aria-current={today === day ? "date" : undefined}
                tabIndex={day === (value.start || today) || (index === 0 && ![month.slice(0, 7), shiftCalendarMonth(month, 1).slice(0, 7)].includes((value.start || today).slice(0, 7)) && day.endsWith("-01")) ? 0 : -1}
                onMouseEnter={() => { if (field === "end" && !value.end) setHoverDay(day); }}
                onFocus={() => { if (field === "end" && !value.end) setHoverDay(day); }} onClick={() => choose(day)}>
                {inRange && <span key={value.end || "preview"} className={styles.rangeBand} data-range-band="true" data-animate={animateRange && Boolean(value.end)} style={{
                  animationDelay: `${delay}ms`, animationDuration: `${dayDuration}ms`,
                  backgroundSize: `${rowLength * 100}% 100%`, backgroundPosition: `${rowLength > 1 ? (cell % 7 - firstInRow) / (rowLength - 1) * 100 : 0}% 0`,
                }} />}
                <span key={`${day}:${selected}`} className={styles.dayNumber} data-selected={selected}
                  data-animate={selected && selection > 0} data-today={day === today}>{Number(day.slice(-2))}</span>
              </button>;
            })}
          </div>
        </section>; })}
      </div>
      <div className={styles.footer}>
        <button type="button" onClick={() => { onChange({ start: "", end: "" }); setField("start"); setHoverDay(""); setAnimateRange(false); }}>{t("Clear dates")}</button>
        {timeZone && <span>{t("Times are entered in")} {timeZone}</span>}
        <button type="button" className={styles.done} onClick={() => close(true)}>{t("Done")}</button>
      </div>
    </div>, document.body)}
  </div>;
}
