import type { FoodRelation, Frequency, Person, Timing } from '../db/types';
import { todayStr, weekday } from './time';

export interface ScheduleFields {
  frequency: Frequency;
  timing: Timing;
  food: FoodRelation;
  foodOffset: number;
}

export interface Preset {
  id: string;
  labelKey: string;
  apply: (person: Person | undefined) => ScheduleFields;
}

const h = (hours: number) => hours * 60;
const daily: Frequency = { kind: 'daily' };
const times = (...t: number[]): Timing => ({ mode: 'times', times: t.map(h) });
const allMeals = (p: Person | undefined): Timing => ({
  mode: 'meals',
  mealIds: (p?.meals ?? []).map((m) => m.id)
});

/** Default clock times for "N times per day". */
export function defaultTimes(count: number): number[] {
  const table: Record<number, number[]> = {
    1: [8],
    2: [8, 20],
    3: [8, 14, 20],
    4: [8, 12, 16, 20]
  };
  const hours =
    table[count] ?? Array.from({ length: count }, (_, i) => 6 + (i * 24) / count);
  return hours.map((x) => Math.round(x * 60) % (24 * 60));
}

export const PRESETS: Preset[] = [
  {
    id: 'once',
    labelKey: 'preset.once',
    apply: () => ({ frequency: daily, timing: times(8), food: 'none', foodOffset: 0 })
  },
  {
    id: 'twice',
    labelKey: 'preset.twice',
    apply: () => ({ frequency: daily, timing: times(8, 20), food: 'none', foodOffset: 0 })
  },
  {
    id: 'three',
    labelKey: 'preset.three',
    apply: () => ({ frequency: daily, timing: times(8, 14, 20), food: 'none', foodOffset: 0 })
  },
  {
    id: 'every8h',
    labelKey: 'preset.every8h',
    apply: () => ({ frequency: daily, timing: times(6, 14, 22), food: 'none', foodOffset: 0 })
  },
  {
    id: 'beforeMeals',
    labelKey: 'preset.beforeMeals',
    apply: (p) => ({ frequency: daily, timing: allMeals(p), food: 'before', foodOffset: 30 })
  },
  {
    id: 'withMeals',
    labelKey: 'preset.withMeals',
    apply: (p) => ({ frequency: daily, timing: allMeals(p), food: 'during', foodOffset: 0 })
  },
  {
    id: 'afterMeals',
    labelKey: 'preset.afterMeals',
    apply: (p) => ({ frequency: daily, timing: allMeals(p), food: 'after', foodOffset: 30 })
  },
  {
    id: 'bedtime',
    labelKey: 'preset.bedtime',
    apply: () => ({ frequency: daily, timing: times(22), food: 'none', foodOffset: 0 })
  },
  {
    id: 'everyOther',
    labelKey: 'preset.everyOther',
    apply: () => ({
      frequency: { kind: 'interval', everyDays: 2 },
      timing: times(8),
      food: 'none',
      foodOffset: 0
    })
  },
  {
    id: 'weekly',
    labelKey: 'preset.weekly',
    apply: () => ({
      frequency: { kind: 'weekdays', days: [weekday(todayStr())] },
      timing: times(8),
      food: 'none',
      foodOffset: 0
    })
  }
];
