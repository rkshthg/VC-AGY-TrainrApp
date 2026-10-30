/**
 * Local-calendar date helpers.
 *
 * `new Date().toISOString().split('T')[0]` gives the UTC date, which is the
 * wrong day for users east of UTC between midnight and their UTC offset
 * (e.g. 00:00-05:30 in India). Use these helpers for any "which day is it"
 * logic instead.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" for the given moment in the device's local time zone. */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local "YYYY-MM-DD" for an ISO timestamp from the database. */
export function localDayKey(iso: string): string {
  return localDateStr(new Date(iso));
}

/** Parse "YYYY-MM-DD" as local midnight (Date("YYYY-MM-DD") would be UTC). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Start and end of a local calendar day, as ISO strings for DB queries. */
export function localDayRangeISO(dateStr: string): { start: string; end: string } {
  const start = parseLocalDate(dateStr);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Whole years between a "YYYY-MM-DD" birth date and now, or undefined. */
export function ageFromDob(dob?: string | null): number | undefined {
  if (!dob) return undefined;
  const birth = parseLocalDate(dob.substring(0, 10));
  if (isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age > 0 && age < 120 ? age : undefined;
}
