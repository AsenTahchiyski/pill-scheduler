import type { DoseUnit, HourFormat, Language, Meal, Medicine, Person, Timing } from '../db/types';
import { LOCALE, translate } from './i18n';
import { doseTimes, type DayEntry } from './schedule';
import { formatDate, formatTime, WEEK_ORDER, weekdayName } from './time';

export const DOSE_UNITS: DoseUnit[] = ['pill', 'drop', 'spray', 'ml'];

/** "2 tablets", "1 drop", "5 ml"; singular for amounts up to 1. */
export function formatDose(lang: Language, med: Pick<Medicine, 'doseAmount' | 'doseUnit'>): string {
  const n = med.doseAmount.toLocaleString(LOCALE[lang], { maximumFractionDigits: 2 });
  const form = med.doseAmount <= 1 ? 'one' : 'many';
  return `${n} ${translate(lang, `unit.${med.doseUnit}.${form}`)}`;
}

/** Dose of a day entry: from the medicine, or the log snapshot if it's gone. */
export function entryDose(lang: Language, e: DayEntry): string {
  return e.med ? formatDose(lang, e.med) : (e.log?.dose ?? '');
}

/**
 * "30 min after Breakfast", "With food", "Before sleep"… or '' for fixed
 * clock times. Without a meal the generic word "food" is used.
 */
export function relationLabel(lang: Language, timing: Timing, meal?: Meal): string {
  if (timing.mode === 'times') return '';
  const zero = timing.offset === 0 ? '0' : '';
  if (timing.mode === 'sleep') {
    return translate(lang, `rel.label.sleep${zero}`, { min: timing.offset });
  }
  const params = { meal: meal?.name ?? translate(lang, 'food.food'), min: timing.offset };
  return timing.relation === 'during'
    ? translate(lang, 'rel.label.during', params)
    : translate(lang, `rel.label.${timing.relation}${zero}`, params);
}

export function frequencyLabel(lang: Language, med: Pick<Medicine, 'frequency'>): string {
  const f = med.frequency;
  switch (f.kind) {
    case 'daily':
      return translate(lang, 'sum.daily');
    case 'weekdays':
      return WEEK_ORDER.filter((d) => f.days.includes(d))
        .map((d) => weekdayName(d, LOCALE[lang]))
        .join(', ');
    case 'interval':
      return f.everyDays === 1
        ? translate(lang, 'sum.daily')
        : translate(lang, 'sum.interval', { n: f.everyDays });
  }
}

export function periodLabel(lang: Language, med: Medicine, today: string): string {
  const fmt = (s: string) =>
    formatDate(s, LOCALE[lang], { day: 'numeric', month: 'short' });
  if (med.endDate && med.endDate < today) return translate(lang, 'sum.ended');
  if (med.startDate > today) {
    return med.endDate
      ? translate(lang, 'sum.range', { from: fmt(med.startDate), to: fmt(med.endDate) })
      : translate(lang, 'sum.from', { date: fmt(med.startDate) });
  }
  return med.endDate
    ? translate(lang, 'sum.until', { date: fmt(med.endDate) })
    : translate(lang, 'sum.ongoing');
}

export function timesLabel(
  med: Medicine,
  person: Person | undefined,
  hourFormat: HourFormat
): string {
  return doseTimes(med.timing, person)
    .map((d) => formatTime(d.time, hourFormat))
    .join(', ');
}
