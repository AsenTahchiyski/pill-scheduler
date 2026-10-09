import type { DoseUnit, ExportPayload, Medicine, Person, Timing } from './types';

// Shape changes between data versions, shared by the Dexie upgrade and by
// importing/restoring older backup payloads.

const DEFAULT_BEDTIME = 22 * 60;

/** v1 stored dose as free text ("5 ml"); guess amount and unit from it. */
function parseDose(text: string): { doseAmount: number; doseUnit: DoseUnit } {
  const amount = parseFloat(text.replace(',', '.'));
  const t = text.toLowerCase();
  const doseUnit: DoseUnit = /vial|флакон/.test(t)
    ? 'vial'
    : /ml|мл/.test(t)
    ? 'ml'
    : /drop|капк/.test(t)
      ? 'drop'
      : /spray|впръск|спрей/.test(t)
        ? 'spray'
        : 'pill';
  return { doseAmount: amount > 0 ? amount : 1, doseUnit };
}

/** Upgrades a v1 medicine (dose text, food fields, meal ids); v2 passes through. */
export function migrateMedicine(raw: any): Medicine {
  if (typeof raw.doseAmount === 'number') return raw as Medicine;
  const { dose, prescription, food, foodOffset, timing, ...rest } = raw;
  void prescription;
  let next: Timing;
  if (timing?.mode === 'meals') {
    next = {
      mode: 'meals',
      count: Math.max(1, timing.mealIds?.length ?? 1),
      relation: food === 'before' || food === 'after' ? food : 'during',
      offset: foodOffset ?? 0
    };
  } else {
    next = { mode: 'times', times: timing?.times ?? [8 * 60] };
  }
  return { ...rest, ...parseDose(String(dose ?? '')), timing: next };
}

export function migratePerson(raw: any): Person {
  return typeof raw.bedtime === 'number' ? raw : { ...raw, bedtime: DEFAULT_BEDTIME };
}

/** Brings any supported payload version to the current shape, or null. */
export function migratePayload(p: any): ExportPayload | null {
  if (
    !p ||
    (p.version !== 1 && p.version !== 2) ||
    !p.settings ||
    !Array.isArray(p.people) ||
    !Array.isArray(p.medicines) ||
    !Array.isArray(p.doses)
  ) {
    return null;
  }
  return {
    ...p,
    version: 2,
    people: p.people.map(migratePerson),
    medicines: p.medicines.map(migrateMedicine)
  };
}
