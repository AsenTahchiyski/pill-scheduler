import { useEffect, useRef } from 'react';
import { buildPayload, writeLocalBackup, type PayloadData } from '../lib/backup';
import { writeBackupFile } from '../lib/fileSync';

/**
 * Mirrors the current data on every change, debounced so rapid edits (e.g.
 * typing a name) don't thrash storage. Two mirrors: localStorage (used by
 * bootstrap to auto-recover if IndexedDB is lost) and the backup JSON file
 * (user-chosen, or the default one in app storage).
 */
export function useAutoBackup(data: PayloadData | undefined): void {
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!data) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const payload = buildPayload(data);
      writeLocalBackup(payload);
      void writeBackupFile(payload);
    }, 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [data]);
}
