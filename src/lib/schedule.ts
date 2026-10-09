import type { DoseLog, Meal, Medicine, Person, Timing } from '../db/types';
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

const clampDay = (t: number) => Math.min(24 * 60 - 1, Math.max(0, t));

/**
 * Clock time of a meal-based dose. "Before" counts back from the meal start,
 * "after" counts from the meal end (start + duration), "during" is the start.
 */
export function mealDoseTime(
  timing: Pick<Extract<Timing, { mode: 'meals' }>, 'relation' | 'offset'>,
  meal: Meal
): number {
  if (timing.relation === 'before') return clampDay(meal.time - timing.offset);
  if (timing.relation === 'after') return clampDay(meal.time + meal.duration + timing.offset);
  return meal.time;
}

/**
 * Which of a person's meals get a dose when taken `count` times a day:
 * spread evenly, always including the first meal (and the last when
 * count > 1). With fewer meals than doses, every meal gets one.
 */
export function pickMeals(meals: Meal[], count: number): Meal[] {
  const sorted = [...meals].sort((a, b) => a.time - b.time);
  if (count >= sorted.length) return sorted;
  if (count <= 1) return sorted.slice(0, 1);
  const idx = new Set(
    Array.from({ length: count }, (_, i) => Math.round((i * (sorted.length - 1)) / (count - 1)))
  );
  return sorted.filter((_, i) => idx.has(i));
}

/**
 * Meals a meal-based timing lands on: the chosen ones, or `count` picked
 * automatically when none were chosen or every chosen meal has since been
 * deleted from the schedule. An explicitly empty choice means no doses.
 */
export function timingMeals(timing: Extract<Timing, { mode: 'meals' }>, meals: Meal[]): Meal[] {
  if (timing.mealIds) {
    if (timing.mealIds.length === 0) return [];
    const chosen = meals.filter((m) => timing.mealIds!.includes(m.id));
    if (chosen.length > 0) return chosen;
  }
  return pickMeals(meals, timing.count);
}

/** Dose times on any active day, sorted. */
export function doseTimes(timing: Timing, person: Person | undefined): ScheduledDose[] {
  let out: ScheduledDose[];
  if (timing.mode === 'times') {
    out = timing.times.map((time) => ({ time }));
  } else if (timing.mode === 'meals') {
    out = timingMeals(timing, person?.meals ?? []).map((meal) => ({
      time: mealDoseTime(timing, meal),
      meal
    }));
  } else {
    out = person ? [{ time: clampDay(person.bedtime - timing.offset) }] : [];
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
    for (const d of doseTimes(med.timing, person)) {
      const key = doseKey(med.id, date, d.time);
      entries.push({
        key,
        date,
        time: d.time,
        meal: d.meal,
        med,
        person,
        log: logByKey.get(key),
        medName: med.name
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
      medName: log.medName
    });
  }

  return entries.sort(
    (a, b) => a.time - b.time || a.medName.localeCompare(b.medName)
  );
}
