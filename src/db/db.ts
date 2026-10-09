import Dexie, { type Table } from 'dexie';
import { translate } from '../lib/i18n';
import { doseKey } from '../lib/schedule';
import { uid } from '../lib/uid';
import type {
  DoseLog,
  DoseStatus,
  ExportPayload,
  Language,
  Meal,
  Medicine,
  Person,
  Settings
} from './types';

interface KVEntry {
  key: string;
  value: unknown;
}

class PillDB extends Dexie {
  settings!: Table<Settings, 'default'>;
  people!: Table<Person, string>;
  medicines!: Table<Medicine, string>;
  doses!: Table<DoseLog, string>;
  kv!: Table<KVEntry, string>;

  constructor() {
    super('pill-scheduler');
    this.version(1).stores({
      settings: 'id',
      people: 'id, createdAt',
      medicines: 'id, personId',
      doses: 'id, date, medicineId, personId',
      kv: 'key'
    });
  }
}

export const db = new PillDB();

export const PERSON_COLORS = [
  '#5ad1c8',
  '#7aa2ff',
  '#f8a978',
  '#c79bff',
  '#ffd166',
  '#ff8fb1',
  '#9ad97a',
  '#ff6b6b'
];

export const defaultSettings = (): Settings => {
  const now = Date.now();
  return {
    id: 'default',
    accentColor: '#5ad1c8',
    themeMode: 'system',
    hourFormat: '24h',
    language: 'bg',
    createdAt: now,
    updatedAt: now
  };
};

export function defaultMeals(lang: Language): Meal[] {
  return [
    { id: uid(), name: translate(lang, 'meal.breakfast'), time: 8 * 60, duration: 20 },
    { id: uid(), name: translate(lang, 'meal.lunch'), time: 13 * 60, duration: 30 },
    { id: uid(), name: translate(lang, 'meal.dinner'), time: 19 * 60, duration: 30 }
  ];
}

export function newPerson(lang: Language, name: string, index: number): Person {
  return {
    id: uid(),
    name,
    color: PERSON_COLORS[index % PERSON_COLORS.length],
    meals: defaultMeals(lang),
    createdAt: Date.now()
  };
}

/** Creates the settings row and a first person on a fresh install. */
export async function ensureSettings(): Promise<Settings> {
  let settings = await db.settings.get('default');
  if (!settings) {
    settings = defaultSettings();
    await db.settings.put(settings);
  }
  if ((await db.people.count()) === 0) {
    await db.people.put(
      newPerson(settings.language, translate(settings.language, 'people.me'), 0)
    );
  }
  return settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update('default', { ...patch, updatedAt: Date.now() });
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  const entry = await db.kv.get(key);
  return entry?.value as T | undefined;
}

export async function setKV(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}

export async function deleteKV(key: string): Promise<void> {
  await db.kv.delete(key);
}

export async function savePerson(person: Person): Promise<void> {
  await db.people.put(person);
}

/** Removes a person with their medicines and dose history. */
export async function deletePerson(id: string): Promise<void> {
  await db.transaction('rw', db.people, db.medicines, db.doses, async () => {
    await db.medicines.where('personId').equals(id).delete();
    await db.doses.where('personId').equals(id).delete();
    await db.people.delete(id);
  });
}

export async function saveMedicine(med: Medicine): Promise<void> {
  await db.medicines.put({ ...med, updatedAt: Date.now() });
}

/** Dose history is kept (it carries name snapshots). */
export async function deleteMedicine(id: string): Promise<void> {
  await db.medicines.delete(id);
}

/** Records a dose; passing the current status again clears it (toggle). */
export async function setDoseStatus(
  med: Medicine,
  date: string,
  time: number,
  status: DoseStatus
): Promise<void> {
  const id = doseKey(med.id, date, time);
  const existing = await db.doses.get(id);
  if (existing?.status === status) {
    await db.doses.delete(id);
    return;
  }
  await db.doses.put({
    id,
    medicineId: med.id,
    personId: med.personId,
    date,
    time,
    status,
    at: Date.now(),
    medName: med.name,
    dose: med.dose
  });
}

export async function isDatabaseEmpty(): Promise<boolean> {
  const counts = await Promise.all([
    db.settings.count(),
    db.people.count(),
    db.medicines.count()
  ]);
  return counts.every((c) => c === 0);
}

export async function restoreFromPayload(payload: ExportPayload): Promise<void> {
  await db.transaction(
    'rw',
    [db.settings, db.people, db.medicines, db.doses],
    async () => {
      await Promise.all([db.people.clear(), db.medicines.clear(), db.doses.clear()]);
      await db.settings.put({ ...payload.settings, id: 'default' });
      await db.people.bulkPut(payload.people);
      await db.medicines.bulkPut(payload.medicines);
      await db.doses.bulkPut(payload.doses);
    }
  );
}
