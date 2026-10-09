export type ThemeMode = 'light' | 'dark' | 'system';
export type HourFormat = '24h' | '12h';
export type Language = 'bg' | 'en';

export interface Settings {
  id: 'default';
  accentColor: string; // hex like "#5ad1c8"
  themeMode: ThemeMode;
  hourFormat: HourFormat;
  language: Language;
  createdAt: number;
  updatedAt: number;
}

/** A usual meal of a person. Times are minutes after local midnight. */
export interface Meal {
  id: string;
  name: string;
  time: number; // start, minutes after midnight
  duration: number; // minutes
}

export interface Person {
  id: string;
  name: string;
  color: string; // hex
  meals: Meal[]; // the person's meal schedule, edited in Settings
  bedtime: number; // minutes after midnight
  createdAt: number;
}

export type DoseUnit = 'pill' | 'drop' | 'spray' | 'ml' | 'vial';

export type FoodRelation = 'before' | 'during' | 'after';

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: 'interval'; everyDays: number }; // counted from startDate

/**
 * When in the day doses are due. Meal and sleep timings follow the person's
 * schedule from Settings, so editing that schedule moves the doses too.
 */
export type Timing =
  | { mode: 'times'; times: number[] } // fixed clock times, minutes after midnight
  | {
      mode: 'meals';
      count: number;
      relation: FoodRelation;
      offset: number;
      /** Chosen meals; when absent (or all deleted), `count` meals are picked automatically. */
      mealIds?: string[];
    }
  | { mode: 'sleep'; offset: number }; // offset minutes before bedtime

export interface Medicine {
  id: string;
  personId: string;
  name: string;
  doseAmount: number;
  doseUnit: DoseUnit;
  notes: string;
  startDate: string; // YYYY-MM-DD, local
  endDate: string | null; // inclusive; null = no end date
  frequency: Frequency;
  timing: Timing;
  reminders: boolean;
  createdAt: number;
  updatedAt: number;
}

export type DoseStatus = 'taken' | 'skipped';

/** A recorded dose. Name/dose are snapshots so history survives edits and deletes. */
export interface DoseLog {
  id: string; // `${medicineId}|${date}|${time}`
  medicineId: string;
  personId: string;
  date: string; // YYYY-MM-DD
  time: number; // scheduled minutes after midnight
  status: DoseStatus;
  at: number; // epoch ms when recorded
  medName: string;
  dose: string; // formatted, e.g. "2 tablets"
}

export interface ExportPayload {
  version: 2;
  exportedAt: number;
  settings: Settings;
  people: Person[];
  medicines: Medicine[];
  doses: DoseLog[];
}
