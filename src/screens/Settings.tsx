import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { ColorSwatch } from '../components/ColorSwatch';
import { Field } from '../components/Field';
import { LanguagePicker } from '../components/LanguagePicker';
import { MealSchedule } from '../components/MealSchedule';
import { Modal } from '../components/Modal';
import { Segmented } from '../components/Segmented';
import { useToast } from '../components/Toast';
import { db, restoreFromPayload, updateSettings } from '../db/db';
import type { ExportPayload, HourFormat, Language, Settings, ThemeMode } from '../db/types';
import { notificationsSupported, showNotification } from '../hooks/useReminders';
import { buildPayload, downloadPayload, downloadText, parsePayload, type PayloadData } from '../lib/backup';
import {
  chooseBackupFile,
  clearBackupFile,
  getBackupTarget,
  requestBackupFileAccess,
  supportsFilePicker,
  writeBackupFile,
  type BackupTarget
} from '../lib/fileSync';
import { buildIcs } from '../lib/ics';
import { useLang, useT } from '../lib/i18n';

interface Props {
  data: PayloadData;
}

export function SettingsScreen({ data }: Props) {
  const t = useT();
  const lang = useLang();
  const { settings } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<ExportPayload | null>(null);
  const [backupTarget, setBackupTarget] = useState<BackupTarget | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported'
  );
  const { flash, node: toast } = useToast();

  useEffect(() => {
    void getBackupTarget().then(setBackupTarget);
  }, []);

  const set = (patch: Partial<Settings>) => updateSettings(patch);
  const reminderMeds = data.medicines.filter((m) => m.reminders);

  const enableNotifications = async () => {
    setPermission(await Notification.requestPermission());
  };

  const exportCalendar = () => {
    downloadText(buildIcs(lang, data.people, reminderMeds), 'pill-scheduler.ics', 'text/calendar');
    flash(t('settings.calendar.done'));
  };

  const handleChooseBackupFile = async () => {
    const name = await chooseBackupFile();
    if (!name) return; // cancelled
    await writeBackupFile(buildPayload(data));
    setBackupTarget(await getBackupTarget());
    flash(t('settings.toast.backupSet'));
  };

  const handleDefaultBackupFile = async () => {
    await clearBackupFile();
    await writeBackupFile(buildPayload(data));
    setBackupTarget(await getBackupTarget());
    flash(t('settings.toast.backupDefault'));
  };

  const handleAllowBackupAccess = async () => {
    if (await requestBackupFileAccess()) {
      await writeBackupFile(buildPayload(data));
      flash(t('settings.toast.backupSet'));
    }
    setBackupTarget(await getBackupTarget());
  };

  const handleFile = async (file: File) => {
    try {
      const parsed = parsePayload(JSON.parse(await file.text()));
      if (!parsed) return flash(t('settings.toast.invalid'));
      setImporting(parsed);
    } catch {
      flash(t('settings.toast.unreadable'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!importing) return;
    if (mode === 'replace') {
      await restoreFromPayload(importing);
    } else {
      // Ids are random strings, so merging is a plain upsert.
      await db.transaction('rw', [db.people, db.medicines, db.doses], async () => {
        await db.people.bulkPut(importing.people);
        await db.medicines.bulkPut(importing.medicines);
        await db.doses.bulkPut(importing.doses);
      });
    }
    setImporting(null);
    flash(t('settings.toast.imported'));
  };

  const card = 'grid gap-4 rounded-2xl border border-line bg-surface-2 p-5';

  return (
    <div className="app-shell">
      <div className="max-w-md mx-auto p-5 pt-6 grid grid-cols-1 gap-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        </header>

        <section className={card}>
          <MealSchedule people={data.people} />
        </section>

        <section className={card}>
          <div>
            <h2 className="font-semibold tracking-tight">{t('settings.reminders')}</h2>
            <p className="text-sm text-ink-dim mt-1">{t('settings.reminders.sub')}</p>
          </div>
          <p className="text-sm">{t(`settings.notif.${permission}`)}</p>
          {permission === 'default' && <Button onClick={enableNotifications}>{t('settings.notif.enable')}</Button>}
          {permission === 'granted' && (
            <Button
              variant="outline"
              onClick={() => void showNotification(t('settings.notif.testTitle'), t('settings.notif.testBody'), 'test')}
            >
              {t('settings.notif.test')}
            </Button>
          )}
          <div className="grid gap-1.5">
            <Button variant="outline" disabled={reminderMeds.length === 0} onClick={exportCalendar}>
              {reminderMeds.length === 0 ? t('settings.calendar.none') : t('settings.calendar')}
            </Button>
            <p className="text-xs text-ink-dim">{t('settings.calendar.hint')}</p>
          </div>
        </section>

        <section className={card}>
          <Field group label={t('settings.language')}>
            <LanguagePicker value={settings.language} onChange={(language: Language) => set({ language })} />
          </Field>
          <Field group label={t('settings.hourFormat')}>
            <Segmented
              id="set-hour"
              ariaLabel={t('settings.hourFormat')}
              value={settings.hourFormat}
              onChange={(v: HourFormat) => set({ hourFormat: v })}
              options={[
                { value: '24h', label: t('hour.24h') },
                { value: '12h', label: t('hour.12h') }
              ]}
            />
          </Field>
          <Field group label={t('settings.theme')}>
            <Segmented
              id="set-theme"
              ariaLabel={t('settings.theme')}
              value={settings.themeMode}
              onChange={(v: ThemeMode) => set({ themeMode: v })}
              options={[
                { value: 'system', label: t('theme.system') },
                { value: 'light', label: t('theme.light') },
                { value: 'dark', label: t('theme.dark') }
              ]}
            />
          </Field>
          <Field group label={t('settings.accent')}>
            <ColorSwatch value={settings.accentColor} onChange={(hex) => set({ accentColor: hex })} />
          </Field>
        </section>

        <section className="grid gap-3 rounded-2xl border border-line bg-surface-2 p-5">
          <div>
            <h2 className="font-semibold tracking-tight">{t('settings.data')}</h2>
            <p className="text-sm text-ink-dim mt-1">{t('settings.dataSub')}</p>
          </div>

          {backupTarget && (
            <div className="grid gap-2 rounded-xl border border-line bg-surface p-4">
              <div className="text-sm font-medium">{t('settings.backup.label')}</div>
              <div className="text-sm text-ink-dim break-all">
                {backupTarget.mode === 'file'
                  ? backupTarget.name
                  : t('settings.backup.defaultPath', { name: backupTarget.name })}
              </div>
              <p className="text-xs text-ink-dim">{t('settings.backup.hint')}</p>
              {backupTarget.mode === 'file' && backupTarget.permission !== 'granted' && (
                <>
                  <p className="text-xs text-ink-dim">{t('settings.backup.needsPermission')}</p>
                  <Button onClick={handleAllowBackupAccess}>{t('settings.backup.allow')}</Button>
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                {supportsFilePicker() && (
                  <Button variant="outline" onClick={handleChooseBackupFile}>
                    {t('settings.backup.choose')}
                  </Button>
                )}
                {backupTarget.mode === 'file' && (
                  <Button variant="outline" onClick={handleDefaultBackupFile}>
                    {t('settings.backup.useDefault')}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadPayload(buildPayload(data));
                flash(t('settings.toast.exported'));
              }}
            >
              {t('settings.export')}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              {t('settings.import')}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </section>
      </div>

      <Modal open={!!importing} onClose={() => setImporting(null)} title={t('settings.import.title')}>
        <div className="grid gap-3">
          <p className="text-sm text-ink-dim">
            {t('settings.import.sub', {
              people: importing?.people.length ?? 0,
              meds: importing?.medicines.length ?? 0
            })}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => applyImport('merge')}>
              {t('settings.import.merge')}
            </Button>
            <Button variant="danger" onClick={() => applyImport('replace')}>
              {t('settings.import.replace')}
            </Button>
          </div>
          <Button variant="outline" onClick={() => setImporting(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>

      {toast}
    </div>
  );
}
