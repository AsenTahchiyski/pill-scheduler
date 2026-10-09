import { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { PersonDot, PersonFilter } from '../components/PersonFilter';
import { setDoseStatus } from '../db/db';
import type { DoseLog, DoseStatus, Medicine, Person, Settings } from '../db/types';
import { notificationsSupported } from '../hooks/useReminders';
import { useNow } from '../hooks/useNow';
import { cx } from '../lib/cx';
import { LOCALE, useLang, useT } from '../lib/i18n';
import { entryDose, relationLabel } from '../lib/labels';
import { dayEntries, type DayEntry } from '../lib/schedule';
import { addDays, daysBetween, formatDate, formatTime, todayStr } from '../lib/time';

interface Props {
  settings: Settings;
  people: Person[];
  medicines: Medicine[];
  doses: DoseLog[];
  onAddMedicine: () => void;
  onOpenSettings: () => void;
}

export function TodayScreen({ settings, people, medicines, doses, onAddMedicine, onOpenSettings }: Props) {
  const t = useT();
  const lang = useLang();
  const now = useNow(30_000);
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [personId, setPersonId] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      dayEntries(date, people, medicines, doses).filter(
        (e) => personId === null || e.person?.id === personId
      ),
    [date, people, medicines, doses, personId]
  );

  const nowDate = new Date(now);
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  const done = entries.filter((e) => e.log?.status === 'taken').length;
  const nextKey =
    date === today ? entries.find((e) => !e.log && e.time >= nowMin)?.key : undefined;
  const offset = daysBetween(today, date);
  const dayTitle =
    offset === 0
      ? t('today.today')
      : offset === -1
        ? t('today.yesterday')
        : offset === 1
          ? t('today.tomorrow')
          : formatDate(date, LOCALE[lang], { weekday: 'long' });
  const showNotifHint =
    date === today &&
    notificationsSupported() &&
    Notification.permission !== 'granted' &&
    entries.some((e) => e.med?.reminders);

  return (
    <div className="app-shell">
      <div className="max-w-md mx-auto p-5 pt-6 grid grid-cols-1 gap-4">
        <header className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDate(addDays(date, -1))}
            className="h-10 w-10 grid place-items-center rounded-xl border border-line bg-surface-2"
          >
            <Icon name="chevronLeft" />
          </button>
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight capitalize">{dayTitle}</h1>
            <p className="text-sm text-ink-dim capitalize">
              {formatDate(date, LOCALE[lang], { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            type="button"
            aria-label="Next day"
            onClick={() => setDate(addDays(date, 1))}
            className="h-10 w-10 grid place-items-center rounded-xl border border-line bg-surface-2"
          >
            <Icon name="chevronRight" />
          </button>
        </header>
        {date !== today && (
          <button type="button" onClick={() => setDate(today)} className="text-sm text-accent justify-self-center -mt-2">
            {t('today.backToday')}
          </button>
        )}

        <PersonFilter people={people} value={personId} onChange={setPersonId} />

        {entries.length > 0 && (
          <div className="grid gap-1.5">
            <div className="text-sm text-ink-dim">{t('today.progress', { done, total: entries.length })}</div>
            <div className="h-2 rounded-full bg-line overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-[width] duration-500"
                style={{ width: `${(done / entries.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {showNotifHint && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 text-left text-sm rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-ink-dim"
          >
            <Icon name="bell" size={18} className="shrink-0 text-accent" />
            {t('today.notifOff')}
          </button>
        )}

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center grid gap-2 justify-items-center">
            <p className="font-medium">{t('today.empty')}</p>
            {medicines.length === 0 && (
              <>
                <p className="text-sm text-ink-dim">{t('today.emptyHint')}</p>
                <Button className="mt-2" onClick={onAddMedicine}>
                  <Icon name="plus" size={18} /> {t('today.addMed')}
                </Button>
              </>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {entries.map((e) => (
              <DoseRow
                key={e.key}
                entry={e}
                settings={settings}
                showPerson={personId === null && people.length > 1}
                overdue={date < today || (date === today && e.time < nowMin)}
                isNext={e.key === nextKey}
                canMark={date <= today}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DoseRow({
  entry: e,
  settings,
  showPerson,
  overdue,
  isNext,
  canMark
}: {
  entry: DayEntry;
  settings: Settings;
  showPerson: boolean;
  overdue: boolean;
  isNext: boolean;
  canMark: boolean;
}) {
  const t = useT();
  const lang = useLang();
  const status = e.log?.status;
  const food = e.med ? relationLabel(lang, e.med.timing, e.meal) : '';
  const dose = entryDose(lang, e);
  const mark = (s: DoseStatus) => e.med && void setDoseStatus(e.med, e.date, e.time, s, dose);

  return (
    <li
      className={cx(
        'rounded-2xl border bg-surface-2 p-3.5 flex gap-3 items-center transition-colors',
        status === 'taken' && 'opacity-70',
        isNext ? 'border-accent' : 'border-line'
      )}
    >
      <div className="w-14 shrink-0 text-center">
        <div className={cx('text-lg font-semibold tabular-nums', status === 'taken' && 'line-through decoration-2')}>
          {formatTime(e.time, settings.hourFormat)}
        </div>
        {!status && isNext && <div className="text-[11px] font-medium text-accent">{t('today.next')}</div>}
        {!status && overdue && canMark && (
          <div className="text-[11px] font-medium text-[rgb(255,107,107)]">{t('today.overdue')}</div>
        )}
      </div>

      <div className="min-w-0 flex-1 grid gap-0.5">
        {showPerson && e.person && (
          <div className="flex items-center gap-1.5 text-xs text-ink-dim">
            <PersonDot color={e.person.color} size={8} /> {e.person.name}
          </div>
        )}
        <div className="font-semibold tracking-tight truncate">
          {e.medName}
          {dose && <span className="font-normal text-ink-dim"> · {dose}</span>}
          {!e.med && <span className="font-normal text-ink-dim"> ({t('today.removed')})</span>}
        </div>
        {food && (
          <div className="text-sm text-ink-dim flex items-center gap-1">
            <Icon name="food" size={14} className="shrink-0" /> <span className="truncate">{food}</span>
          </div>
        )}
        {status === 'taken' && e.log && (
          <div className="text-xs text-accent">
            {t('today.taken', {
              time: formatTime(new Date(e.log.at).getHours() * 60 + new Date(e.log.at).getMinutes(), settings.hourFormat)
            })}
          </div>
        )}
        {status === 'skipped' && <div className="text-xs text-ink-dim">{t('today.skipped')}</div>}
      </div>

      {canMark && e.med && (
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            aria-label={t('today.skip')}
            aria-pressed={status === 'skipped'}
            onClick={() => mark('skipped')}
            className={cx(
              'h-11 w-11 grid place-items-center rounded-xl border transition-colors',
              status === 'skipped' ? 'border-ink-dim bg-line text-ink' : 'border-line text-ink-dim'
            )}
          >
            <Icon name="skip" size={18} />
          </button>
          <button
            type="button"
            aria-label={t('today.take')}
            aria-pressed={status === 'taken'}
            onClick={() => mark('taken')}
            className={cx(
              'h-11 w-11 grid place-items-center rounded-xl border transition-colors',
              status === 'taken'
                ? 'border-accent bg-accent text-accent-contrast'
                : 'border-accent/50 text-accent'
            )}
          >
            <Icon name="check" size={22} />
          </button>
        </div>
      )}
    </li>
  );
}
