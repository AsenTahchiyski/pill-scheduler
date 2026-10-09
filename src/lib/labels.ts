import type { HourFormat, Language, Meal, Medicine, Person } from '../db/types';
import { LOCALE, translate } from './i18n';
import { doseTimes } from './schedule';
import { formatDate, formatTime, WEEK_ORDER, weekdayName } from './time';

/** "30 min before Breakfast", "With food", … or '' when food doesn't matter. */
export function foodLabel(
  lang: Language,
  med: Pick<Medicine, 'food' | 'foodOffset'>,
  meal?: Meal
): string {
  if (med.food === 'none') return '';
  const params = {
    meal: meal?.name ?? translate(lang, 'food.food'),
    min: med.foodOffset
  };
  const zero = med.food !== 'during' && med.foodOffset === 0 ? '0' : '';
  return translate(lang, `food.label.${med.food}${zero}`, params);
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
  return doseTimes(med, person)
    .map((d) => formatTime(d.time, hourFormat))
    .join(', ');
}
