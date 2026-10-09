import type { HourFormat } from '../db/types';

// Dates are local calendar days as "YYYY-MM-DD"; clock times are minutes
// after local midnight. Both are timezone-free on purpose: a dose at 08:00
// stays at 08:00 when travelling.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/** Parses "YYYY-MM-DD" as a local date at noon (DST-safe for day math). */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export function weekday(s: string): number {
  return parseDate(s).getDay();
}

export function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** "HH:MM" (as used by <input type="time">) ↔ minutes. */
export function toHHMM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function fromHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatTime(min: number, fmt: HourFormat): string {
  if (fmt === '24h') return toHHMM(min);
  const h = Math.floor(min / 60);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${pad(min % 60)} ${suffix}`;
}

export function formatDate(
  s: string,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
): string {
  return parseDate(s).toLocaleDateString(locale, opts);
}

/** Short weekday name for 0 = Sunday … 6 = Saturday. */
export function weekdayName(day: number, locale: string): string {
  // 2024-01-07 was a Sunday.
  return new Date(2024, 0, 7 + day, 12).toLocaleDateString(locale, { weekday: 'short' });
}

/** Monday-first display order. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
