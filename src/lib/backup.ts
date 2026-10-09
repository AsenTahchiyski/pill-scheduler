import { migratePayload } from '../db/migrate';
import type { ExportPayload } from '../db/types';

// localStorage is a separate store from IndexedDB, so it survives an
// IndexedDB-only loss (corruption / partial eviction). Note: a full
// origin storage clear wipes localStorage too — the off-device backup
// file (downloadPayload) is the only guard against that.
const LOCAL_BACKUP_KEY = 'pill-scheduler-backup-v1';

export type PayloadData = Omit<ExportPayload, 'version' | 'exportedAt'>;

export function buildPayload(data: PayloadData): ExportPayload {
  return { version: 2, exportedAt: Date.now(), ...data };
}

/** Validates a parsed backup and upgrades older versions; null if invalid. */
export function parsePayload(p: unknown): ExportPayload | null {
  return migratePayload(p);
}

/**
 * Ask the browser to keep our storage durable so it isn't evicted under
 * storage pressure. Auto-granted for installed PWAs; a no-op elsewhere.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Mirror the current data into localStorage (best effort). */
export function writeLocalBackup(payload: ExportPayload): void {
  try {
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — nothing we can do.
  }
}

export function readLocalBackup(): ExportPayload | null {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!raw) return null;
    return parsePayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Trigger a browser download of a text file. */
export function downloadText(text: string, filename: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Download a JSON file. This lands outside the origin's storage box (in the
 * device's Downloads), so it survives a full browser storage clear.
 */
export function downloadPayload(payload: ExportPayload): void {
  const stamp = new Date(payload.exportedAt)
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  downloadText(
    JSON.stringify(payload, null, 2),
    `pill-scheduler-${stamp}.json`,
    'application/json'
  );
}
