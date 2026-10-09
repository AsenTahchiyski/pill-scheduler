import { deleteKV, getKV, setKV } from '../db/db';
import type { ExportPayload } from '../db/types';

// Mirrors game-lib's model: one JSON file is the standing backup target and
// gets rewritten on every data change. On the web there are two possible
// targets:
//  - a user-chosen file via the File System Access API (Chromium desktop) —
//    the handle is persisted in IndexedDB and reused across sessions;
//  - the default: a file in the origin-private file system (OPFS), which
//    needs no permission and works in every modern browser, but lives inside
//    the browser's storage rather than in a user-visible folder.

const HANDLE_KEY = 'backupFileHandle';
export const DEFAULT_BACKUP_NAME = 'pill-scheduler.json';

export type BackupTarget =
  | { mode: 'file'; name: string; permission: PermissionState }
  | { mode: 'default'; name: string };

export function supportsFilePicker(): boolean {
  return typeof window.showSaveFilePicker === 'function';
}

const getStoredHandle = () =>
  getKV<FileSystemFileHandle>(HANDLE_KEY);

async function queryPermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  // Browsers that can persist handles all implement queryPermission, but be
  // defensive: without it, assume we must fall back to the default file.
  if (!handle.queryPermission) return 'denied';
  try {
    return await handle.queryPermission({ mode: 'readwrite' });
  } catch {
    return 'denied';
  }
}

/** Where the next backup write will go, for display in Settings. */
export async function getBackupTarget(): Promise<BackupTarget> {
  const handle = await getStoredHandle();
  if (handle) {
    return {
      mode: 'file',
      name: handle.name,
      permission: await queryPermission(handle)
    };
  }
  return { mode: 'default', name: DEFAULT_BACKUP_NAME };
}

/**
 * Let the user pick (or create) the backup file. Returns its name, or null
 * if the picker was cancelled or is unsupported.
 */
export async function chooseBackupFile(): Promise<string | null> {
  if (!window.showSaveFilePicker) return null;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: DEFAULT_BACKUP_NAME,
      types: [
        {
          description: 'Pill Scheduler backup',
          accept: { 'application/json': ['.json'] }
        }
      ]
    });
    await setKV(HANDLE_KEY, handle);
    return handle.name;
  } catch {
    // AbortError (user cancelled) or picker unavailable.
    return null;
  }
}

/** Drop the chosen file and go back to the default OPFS file. */
export async function clearBackupFile(): Promise<void> {
  await deleteKV(HANDLE_KEY);
}

/**
 * Re-request write access to the stored handle after a restart. Must be
 * called from a user gesture. Returns true when access is granted.
 */
export async function requestBackupFileAccess(): Promise<boolean> {
  const handle = await getStoredHandle();
  if (!handle?.requestPermission) return false;
  try {
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

async function writeHandle(
  handle: FileSystemFileHandle,
  payload: ExportPayload
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

async function getOpfsHandle(create: boolean): Promise<FileSystemFileHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getFileHandle(DEFAULT_BACKUP_NAME, { create });
}

/**
 * Write the payload to the current backup target. When a chosen file exists
 * but access hasn't been re-granted this session, the write lands in the
 * default OPFS file instead so no change is ever left unmirrored.
 */
export async function writeBackupFile(payload: ExportPayload): Promise<void> {
  const handle = await getStoredHandle();
  if (handle && (await queryPermission(handle)) === 'granted') {
    try {
      await writeHandle(handle, payload);
      return;
    } catch {
      // File moved/deleted or write failed — fall through to the default.
    }
  }
  try {
    await writeHandle(await getOpfsHandle(true), payload);
  } catch {
    // No OPFS (very old browser) — the localStorage mirror still covers us.
  }
}

/** Read the default OPFS backup, for recovery when IndexedDB comes up empty. */
export async function readDefaultBackupFile(): Promise<unknown | null> {
  try {
    const file = await (await getOpfsHandle(false)).getFile();
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}
