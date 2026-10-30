/**
 * Two-way sync of settings, people, medicines and dose logs with a JSON file
 * the user picks, so several devices can share one data set (e.g. a file in a
 * synced folder). The file uses the same `ExportPayload` shape as manual
 * export, so it can also be imported by hand.
 *
 * Live sync uses the File System Access API (Chromium only); elsewhere the
 * Settings screen falls back to manual export / import.
 *
 * Sync is a three-way check against `SyncRecord.lastSynced`: whichever side
 * changed since then wins; if both did, the newer one wins (last write wins).
 * Records are matched across devices by their `id` (uids, or `doseKey`).
 */
import { liveQuery } from 'dexie';
import { db, deleteKV, getKV, setKV } from '../db/db';
import type { DoseLog, Medicine, Person, Settings } from '../db/types';
import { buildPayload, parsePayload } from './backup';

const RECORD_KEY = 'syncFile';
// Where earlier versions kept the (write-only) backup file handle.
const LEGACY_HANDLE_KEY = 'backupFileHandle';

const FILE_TYPES = [
  { description: 'Pill Scheduler data', accept: { 'application/json': ['.json'] } }
];
const SUGGESTED_NAME = 'pill-scheduler.json';

// Device-local fields (id, timestamps) stay out of sync.
const SYNCED_SETTINGS = ['accentColor', 'themeMode', 'hourFormat', 'language'] as const;

type SyncedSettings = Pick<Settings, (typeof SYNCED_SETTINGS)[number]>;

/** What gets synced; compared as a canonical JSON string. */
interface SyncContent {
  settings: SyncedSettings;
  people: Person[];
  medicines: Medicine[];
  doses: DoseLog[];
}

/**
 * The linked file (kept in the kv table). `lastSynced` is the canonical
 * content last known to match both the file and this device — the base for
 * the three-way "who changed?" check. Empty right after linking a file.
 */
interface SyncRecord {
  handle: FileSystemFileHandle;
  fileName: string;
  lastSynced: string;
  /** When this device's data last diverged from `lastSynced` (ms). */
  localChangedAt: number;
}

export type SyncState =
  | { kind: 'off' }
  | { kind: 'needs-permission'; fileName: string }
  | { kind: 'connected'; fileName: string; lastSyncAt?: number }
  | { kind: 'error'; fileName: string; message: string };

/** i18n keys for conflict notices. */
export type SyncNotice = 'sync.conflictFile' | 'sync.conflictLocal';

export const liveSyncSupported =
  typeof window !== 'undefined' &&
  !!window.showSaveFilePicker &&
  !!window.showOpenFilePicker;

// ---- State + subscription -------------------------------------------------

let state: SyncState = { kind: 'off' };
let notice: SyncNotice | null = null;
const listeners = new Set<() => void>();

function setState(next: SyncState): void {
  state = next;
  listeners.forEach((l) => l());
}

function setNotice(next: SyncNotice | null): void {
  notice = next;
  listeners.forEach((l) => l());
}

export const getSyncState = (): SyncState => state;
export const getSyncNotice = (): SyncNotice | null => notice;
export const clearSyncNotice = (): void => setNotice(null);

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getRecord = () => getKV<SyncRecord>(RECORD_KEY);
const patchRecord = async (patch: Partial<SyncRecord>) => {
  const rec = await getRecord();
  if (rec) await setKV(RECORD_KEY, { ...rec, ...patch });
};

// ---- Canonical content ----------------------------------------------------

/** JSON with sorted object keys, so equal data always gives the same string. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v
  );
}

const byId = <T extends { id: string }>(list: T[]): T[] =>
  [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

function toContent(d: {
  settings: Settings;
  people: Person[];
  medicines: Medicine[];
  doses: DoseLog[];
}): SyncContent {
  const s = {} as Record<string, unknown>;
  for (const k of SYNCED_SETTINGS) s[k] = d.settings[k];
  return {
    settings: s as unknown as SyncedSettings,
    people: byId(d.people),
    medicines: byId(d.medicines),
    doses: byId(d.doses)
  };
}

async function localData() {
  const [settings, people, medicines, doses] = await Promise.all([
    db.settings.get('default'),
    db.people.toArray(),
    db.medicines.toArray(),
    db.doses.toArray()
  ]);
  return { settings, people, medicines, doses };
}

async function localContent(): Promise<string> {
  const d = await localData();
  return d.settings ? canonical(toContent({ ...d, settings: d.settings })) : '';
}

function parseFile(text: string) {
  if (!text.trim()) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('sync.invalidFile');
  }
  const payload = parsePayload(raw);
  if (!payload) throw new Error('sync.invalidFile');
  return payload;
}

// ---- Applying incoming content --------------------------------------------

/**
 * Write incoming content into the local DB. 'replace' mirrors the file
 * exactly (records missing from it are removed here too); 'merge' only adds
 * and updates, so linking a file never loses this device's data.
 */
async function applyContent(c: SyncContent, mode: 'replace' | 'merge'): Promise<void> {
  await db.transaction('rw', [db.settings, db.people, db.medicines, db.doses], async () => {
    // A fresh install only holds the default person: adopt the file as is
    // instead of keeping a second, empty "Me".
    if (mode === 'merge' && (await db.medicines.count()) === 0 && (await db.doses.count()) === 0) {
      mode = 'replace';
    }
    await db.settings.update('default', { ...c.settings, updatedAt: Date.now() });
    const tables = [
      [db.people, c.people],
      [db.medicines, c.medicines],
      [db.doses, c.doses]
    ] as const;
    for (const [table, rows] of tables) {
      if (mode === 'replace') {
        const keep = new Set(rows.map((r) => r.id));
        const gone = (await table.toCollection().primaryKeys()).filter((k) => !keep.has(k));
        await table.bulkDelete(gone);
      }
      await (table as typeof db.people).bulkPut(rows as Person[]);
    }
  });
}

// ---- Sync engine ----------------------------------------------------------

// Every sync step runs one at a time so a local edit can't race a pull.
let queue: Promise<void> = Promise.resolve();
function enqueue(step: () => Promise<void>): Promise<void> {
  queue = queue.then(step, step);
  return queue;
}

async function writeFile(handle: FileSystemFileHandle): Promise<void> {
  const { settings, people, medicines, doses } = await localData();
  const w = await handle.createWritable();
  await w.write(
    JSON.stringify(buildPayload({ settings: settings!, people, medicines, doses }), null, 2)
  );
  await w.close();
}

async function runSync(): Promise<void> {
  const rec = await getRecord();
  if (!rec) return;
  try {
    if ((await rec.handle.queryPermission?.({ mode: 'readwrite' })) !== 'granted') {
      setState({ kind: 'needs-permission', fileName: rec.fileName });
      return;
    }
    const file = parseFile(await (await rec.handle.getFile()).text());
    const fileContent = file ? canonical(toContent(file)) : null;
    const local = await localContent();

    let pull: boolean;
    if (fileContent === null || fileContent === local) {
      pull = false;
    } else if (rec.lastSynced === '') {
      pull = true; // freshly linked existing file: adopt it (merged)
    } else if (local === rec.lastSynced) {
      pull = true; // only the file changed
    } else if (fileContent === rec.lastSynced) {
      pull = false; // only this device changed
    } else {
      // Both changed: last write wins.
      pull = file!.exportedAt > rec.localChangedAt;
      setNotice(pull ? 'sync.conflictFile' : 'sync.conflictLocal');
    }

    if (pull) {
      await applyContent(toContent(file!), rec.lastSynced === '' ? 'merge' : 'replace');
    }
    const now = await localContent();
    if (now !== fileContent) await writeFile(rec.handle);

    await patchRecord({ lastSynced: now });
    setState({ kind: 'connected', fileName: rec.fileName, lastSyncAt: Date.now() });
  } catch (err) {
    setState({
      kind: 'error',
      fileName: rec.fileName,
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

export const syncNow = (): Promise<void> => enqueue(runSync);

async function onLocalChange(content: string): Promise<void> {
  const rec = await getRecord();
  if (!rec || content === rec.lastSynced) return;
  await patchRecord({ localChangedAt: Date.now() });
  if (state.kind === 'connected') await runSync();
}

let started = false;

/** Call once at boot: restores the linked file and starts watching for edits. */
export async function initSync(): Promise<void> {
  if (started) return;
  started = true;

  // A file chosen as the one-way backup target becomes the sync file.
  const legacy = await getKV<FileSystemFileHandle>(LEGACY_HANDLE_KEY);
  if (legacy) {
    if (!(await getRecord())) {
      await setKV(RECORD_KEY, {
        handle: legacy,
        fileName: legacy.name,
        lastSynced: '',
        localChangedAt: Date.now()
      } satisfies SyncRecord);
    }
    await deleteKV(LEGACY_HANDLE_KEY);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let first = true;
  liveQuery(localContent).subscribe((content) => {
    // The initial emission is the state at boot, not an edit.
    if (first) {
      first = false;
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => enqueue(() => onLocalChange(content)), 400);
  });
  // Pick up edits made on other devices when the app comes back to the front.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.kind === 'connected') {
      void syncNow();
    }
  });

  if (await getRecord()) await syncNow();
}

async function link(handle: FileSystemFileHandle): Promise<void> {
  if ((await handle.requestPermission?.({ mode: 'readwrite' })) !== 'granted') return;
  await setKV(RECORD_KEY, {
    handle,
    fileName: handle.name,
    lastSynced: '',
    localChangedAt: Date.now()
  } satisfies SyncRecord);
  await syncNow();
}

const isAbort = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';

/** Create (or overwrite) a file and fill it with this device's data. */
export async function createSyncFile(): Promise<void> {
  try {
    const handle = await window.showSaveFilePicker!({
      suggestedName: SUGGESTED_NAME,
      types: FILE_TYPES
    });
    // Empty it first so the sync pushes local data instead of adopting old content.
    const w = await handle.createWritable();
    await w.close();
    await link(handle);
  } catch (err) {
    if (!isAbort(err)) throw err;
  }
}

/** Link an existing file: its data is merged into this device's. */
export async function openSyncFile(): Promise<void> {
  try {
    const [handle] = await window.showOpenFilePicker!({ types: FILE_TYPES });
    await link(handle);
  } catch (err) {
    if (!isAbort(err)) throw err;
  }
}

/** Re-grant file access after a reload (must run from a user gesture). */
export async function reconnectSync(): Promise<void> {
  const rec = await getRecord();
  if (!rec) return;
  if ((await rec.handle.requestPermission?.({ mode: 'readwrite' })) === 'granted') {
    await syncNow();
  }
}

export async function disconnectSync(): Promise<void> {
  await enqueue(async () => {
    await deleteKV(RECORD_KEY);
    setState({ kind: 'off' });
    setNotice(null);
  });
}
