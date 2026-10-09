import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ensureSettings, isDatabaseEmpty, restoreFromPayload } from './db/db';
import { parsePayload, readLocalBackup, requestPersistentStorage } from './lib/backup';
import { readDefaultBackupFile } from './lib/fileSync';
import { applyAccent, applyThemeMode } from './theme/ThemeProvider';
import './index.css';

async function bootstrap() {
  // Mark our storage durable so the browser won't evict it under pressure.
  await requestPersistentStorage();

  // If IndexedDB came up empty (wiped/evicted/corrupted), restore from the
  // localStorage mirror, or failing that the default backup file in app
  // storage, before fresh defaults get created.
  try {
    if (await isDatabaseEmpty()) {
      const backup = readLocalBackup() ?? parsePayload(await readDefaultBackupFile());
      if (backup) await restoreFromPayload(backup);
    }
  } catch {
    // Best effort — fall through to normal bootstrap.
  }

  const settings = await ensureSettings();
  // Apply theme synchronously to avoid a flash on first paint.
  applyAccent(settings.accentColor);
  applyThemeMode(settings.themeMode);
  document.documentElement.lang = settings.language;

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
