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
  meals: Meal[];
  createdAt: number;
}

export type FoodRelation = 'none' | 'before' | 'during' | 'after';

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: 'interval'; everyDays: number }; // counted from startDate

export type Timing =
  | { mode: 'times'; times: number[] } // fixed clock times, minutes after midnight
  | { mode: 'meals'; mealIds: string[] }; // derived from the person's meals

export interface Medicine {
  id: string;
  personId: string;
  name: string;
  dose: string; // free text, e.g. "1 tablet", "5 ml"
  prescription: boolean;
  notes: string;
  startDate: string; // YYYY-MM-DD, local
  endDate: string | null; // inclusive; null = ongoing
  frequency: Frequency;
  timing: Timing;
  food: FoodRelation;
  foodOffset: number; // minutes, used for 'before' / 'after'
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
  dose: string;
}

export interface ExportPayload {
  version: 1;
  exportedAt: number;
  settings: Settings;
  people: Person[];
  medicines: Medicine[];
  doses: DoseLog[];
}
