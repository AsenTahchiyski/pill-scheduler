import type { ExportPayload } from '../db/types';

// A standing backup JSON file in the origin-private file system (OPFS),
// rewritten on every data change. It needs no permission and works in every
// modern browser, but lives inside the browser's storage rather than in a
// user-visible folder. (A user-chosen, user-visible file is the sync file —
// see syncFile.ts.)

export const DEFAULT_BACKUP_NAME = 'pill-scheduler.json';

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

/** Write the payload to the default OPFS backup file. */
export async function writeBackupFile(payload: ExportPayload): Promise<void> {
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
