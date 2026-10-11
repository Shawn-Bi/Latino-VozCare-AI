// Month calendar with the saved appointment day highlighted (computed in the appointment's time zone).
export default function AppointmentCalendar({ start, timeZone, es }: { start: Date; timeZone: string; es: boolean }) {
  const locale = es ? "es-US" : "en-US";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(start).map((x) => [x.type, x.value]));
  const year = Number(parts.year), month = Number(parts.month) - 1, day = Number(parts.day);
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + i))));
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return <div className="month pv-month" aria-hidden="true">
    <div className="month-title">{title}</div>
    <div className="weekdays">{weekdays.map((w, i) => <span key={i}>{w}</span>)}</div>
    <div className="month-grid">{cells.map((d, i) => <span key={i} className={d === day ? "selected" : ""}>{d ?? ""}</span>)}</div>
  </div>;
}