import type { Language, Medicine, Person } from '../db/types';
import { formatDose, relationLabel } from './labels';
import { translate } from './i18n';
import { doseTimes, isActiveOn } from './schedule';
import { addDays, todayStr, toHHMM } from './time';

// iCalendar export so the phone's calendar app can ring reliably, which a
// closed PWA can't. Times are "floating" (no TZID): 08:00 stays 08:00 local.

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const icsDate = (date: string) => date.replace(/-/g, '');
export const icsDateTime = (date: string, min: number) =>
  `${icsDate(date)}T${toHHMM(min).replace(':', '')}00`;

// RFC 5545 lines must be folded at 75 octets (UTF-8), continuation lines
// starting with a space. Split on code points so characters stay whole.
const encoder = new TextEncoder();
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // leading space counts
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function rrule(med: Medicine): string {
  const f = med.frequency;
  let rule =
    f.kind === 'daily'
      ? 'FREQ=DAILY'
      : f.kind === 'interval'
        ? `FREQ=DAILY;INTERVAL=${Math.max(1, f.everyDays)}`
        : `FREQ=WEEKLY;BYDAY=${f.days.map((d) => DAY_CODES[d]).join(',')}`;
  if (med.endDate) rule += `;UNTIL=${icsDate(med.endDate)}T235959`;
  return rule;
}

/** First date ≥ startDate the medicine is due on (DTSTART must be an occurrence). */
export function firstDay(med: Medicine): string | null {
  for (let i = 0, d = med.startDate; i < 7; i++, d = addDays(d, 1)) {
    if (isActiveOn(med, d)) return d;
  }
  return null;
}

/** Builds a calendar with one recurring event per dose time of each medicine. */
export function buildIcs(lang: Language, people: Person[], meds: Medicine[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//pill-scheduler//EN',
    'CALSCALE:GREGORIAN'
  ];
  for (const med of meds) {
    const start = firstDay(med);
    if (!start || (med.endDate && med.endDate < todayStr())) continue;
    const person = people.find((p) => p.id === med.personId);
    for (const d of doseTimes(med.timing, person)) {
      const summary = person
        ? translate(lang, 'notif.titleFor', { med: med.name, person: person.name })
        : med.name;
      const desc = [formatDose(lang, med), relationLabel(lang, med.timing, d.meal), med.notes]
        .filter(Boolean)
        .join('\n');
      lines.push(
        'BEGIN:VEVENT',
        // Stable UID: re-importing updates instead of duplicating (where supported).
        `UID:${med.id}-${d.time}@pill-scheduler`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDateTime(start, d.time)}`,
        'DURATION:PT5M',
        `RRULE:${rrule(med)}`,
        `SUMMARY:💊 ${esc(summary)}`,
        `DESCRIPTION:${esc(desc)}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(summary)}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT'
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
