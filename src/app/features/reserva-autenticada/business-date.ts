/**
 * Calendar helpers for the booking window. A "business day" is a date-only value (YYYY-MM-DD) in the company timezone:
 * the first week of availability starts on the company's today, never on the UTC date or the browser's own zone.
 */

/** Today's date as the wall clock of `timeZone` shows it at `instant`. */
export function businessToday(timeZone: string, instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(instant);
}

/** Calendar arithmetic on a date-only value (independent of DST and of any timezone). */
export function addDays(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
