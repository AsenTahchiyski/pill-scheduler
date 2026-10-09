import type { Timing } from '../db/types';

/** "How often" choices in the medicine form. Numbers are doses per day. */
export type Often = 1 | 2 | 3 | 'every8h' | 'custom';

export const OFTEN_COUNTS = [1, 2, 3] as const;

export const EVERY_8H = [6 * 60, 14 * 60, 22 * 60];

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

const same = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => v === b[i]);

/** Which "How often" chip a timing corresponds to. */
export function oftenOf(timing: Timing): Often {
  if (timing.mode === 'sleep') return 1;
  if (timing.mode === 'meals') {
    return timing.count >= 1 && timing.count <= 3 ? (timing.count as 1 | 2 | 3) : 'custom';
  }
  if (same(timing.times, EVERY_8H)) return 'every8h';
  for (const n of OFTEN_COUNTS) if (same(timing.times, defaultTimes(n))) return n;
  return 'custom';
}
