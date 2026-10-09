import type { DoseLog, Meal, Medicine, Person } from '../db/types';
import { daysBetween, weekday } from './time';

export const doseKey = (medicineId: string, date: string, time: number) =>
  `${medicineId}|${date}|${time}`;

export interface ScheduledDose {
  time: number; // minutes after midnight
  meal?: Meal; // set when derived from a meal
}

export interface DayEntry {
  key: string;
  date: string;
  time: number;
  meal?: Meal;
  med: Medicine | undefined; // undefined: medicine deleted, log only
  person: Person | undefined;
  log: DoseLog | undefined;
  medName: string;
  dose: string;
}

export function isActiveOn(med: Medicine, date: string): boolean {
  if (date < med.startDate) return false;
  if (med.endDate && date > med.endDate) return false;
  const f = med.frequency;
  switch (f.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return f.days.includes(weekday(date));
    case 'interval':
      return daysBetween(med.startDate, date) % Math.max(1, f.everyDays) === 0;
  }
}

/**
 * Clock time of a meal-based dose. "Before" counts back from the meal start,
 * "after" counts from the meal end (start + duration), "during" is the start.
 */
export function mealDoseTime(med: Pick<Medicine, 'food' | 'foodOffset'>, meal: Meal): number {
  let t = meal.time;
  if (med.food === 'before') t = meal.time - med.foodOffset;
  if (med.food === 'after') t = meal.time + meal.duration + med.foodOffset;
  return Math.min(24 * 60 - 1, Math.max(0, t));
}

/** Dose times on any active day, sorted. */
export function doseTimes(
  med: Pick<Medicine, 'timing' | 'food' | 'foodOffset'>,
  person: Person | undefined
): ScheduledDose[] {
  let out: ScheduledDose[];
  if (med.timing.mode === 'times') {
    out = med.timing.times.map((time) => ({ time }));
  } else {
    const ids = med.timing.mealIds;
    out = (person?.meals ?? [])
      .filter((m) => ids.includes(m.id))
      .map((meal) => ({ time: mealDoseTime(med, meal), meal }));
  }
  // One entry per clock time (the dose log is keyed by it).
  const seen = new Set<number>();
  return out
    .sort((a, b) => a.time - b.time)
    .filter((d) => !seen.has(d.time) && seen.add(d.time));
}

/** All doses due on a date, merged with recorded logs, sorted by time. */
export function dayEntries(
  date: string,
  people: Person[],
  meds: Medicine[],
  logs: DoseLog[]
): DayEntry[] {
  const personById = new Map(people.map((p) => [p.id, p]));
  const medById = new Map(meds.map((m) => [m.id, m]));
  const logByKey = new Map(logs.filter((l) => l.date === date).map((l) => [l.id, l]));
  const entries: DayEntry[] = [];

  for (const med of meds) {
    if (!isActiveOn(med, date)) continue;
    const person = personById.get(med.personId);
    for (const d of doseTimes(med, person)) {
      const key = doseKey(med.id, date, d.time);
      entries.push({
        key,
        date,
        time: d.time,
        meal: d.meal,
        med,
        person,
        log: logByKey.get(key),
        medName: med.name,
        dose: med.dose
      });
      logByKey.delete(key);
    }
  }

  // Logs that no longer match the schedule (medicine edited or deleted)
  // still belong to the day's history.
  for (const log of logByKey.values()) {
    entries.push({
      key: log.id,
      date,
      time: log.time,
      med: medById.get(log.medicineId),
      person: personById.get(log.personId),
      log,
      medName: log.medName,
      dose: log.dose
    });
  }

  return entries.sort(
    (a, b) => a.time - b.time || a.medName.localeCompare(b.medName)
  );
}
