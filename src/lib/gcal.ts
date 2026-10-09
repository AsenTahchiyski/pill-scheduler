import type { Language, Medicine, Person } from '../db/types';
import { firstDay, icsDateTime, rrule } from './ics';
import { translate } from './i18n';
import { formatDose, relationLabel } from './labels';
import type { ScheduledDose } from './schedule';

/**
 * Link that opens Google Calendar with a pre-filled repeating event for one
 * dose time; the user confirms with Save. Google offers no way for an app to
 * create recurring timed *reminders* (they live in Google Tasks, whose API
 * drops the time and has no repetition), so this is the closest option.
 * Times are floating, i.e. interpreted in the calendar's own time zone.
 */
export function googleCalendarUrl(
  lang: Language,
  med: Medicine,
  person: Person | undefined,
  dose: ScheduledDose
): string | null {
  const start = firstDay(med);
  if (!start) return null;
  const end = dose.time + 5 < 24 * 60 ? dose.time + 5 : dose.time;
  const title = person
    ? translate(lang, 'notif.titleFor', { med: med.name, person: person.name })
    : med.name;
  const details = [formatDose(lang, med), relationLabel(lang, med.timing, dose.meal), med.notes]
    .filter(Boolean)
    .join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `💊 ${title}`,
    dates: `${icsDateTime(start, dose.time)}/${icsDateTime(start, end)}`,
    details,
    recur: `RRULE:${rrule(med)}`,
    crm: 'AVAILABLE' // show as free so it doesn't block the calendar
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
