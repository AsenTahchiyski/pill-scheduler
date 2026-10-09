import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PersonDot, PersonFilter } from '../components/PersonFilter';
import type { DoseLog, Medicine, Person, Settings } from '../db/types';
import { cx } from '../lib/cx';
import { LOCALE, useLang, useT } from '../lib/i18n';
import { dayEntries } from '../lib/schedule';
import { addDays, formatDate, formatTime, todayStr } from '../lib/time';

const DAYS = 14;

interface Props {
  settings: Settings;
  people: Person[];
  medicines: Medicine[];
  doses: DoseLog[];
}

export function HistoryScreen({ settings, people, medicines, doses }: Props) {
  const t = useT();
  const lang = useLang();
  const [personId, setPersonId] = useState<string | null>(null);

  const days = useMemo(() => {
    const today = todayStr();
    return Array.from({ length: DAYS }, (_, i) => {
      const date = addDays(today, -i);
      const entries = dayEntries(date, people, medicines, doses).filter(
        (e) => personId === null || e.person?.id === personId
      );
      return { date, entries };
    });
  }, [people, medicines, doses, personId]);

  return (
    <div className="app-shell">
      <div className="max-w-md mx-auto p-5 pt-6 grid grid-cols-1 gap-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{t('history.title')}</h1>
          <p className="text-sm text-ink-dim mt-1">{t('history.sub')}</p>
        </header>

        <PersonFilter people={people} value={personId} onChange={setPersonId} />

        {days.map(({ date, entries }) => {
          const taken = entries.filter((e) => e.log?.status === 'taken').length;
          return (
            <section key={date} className="rounded-2xl border border-line bg-surface-2 p-4 grid grid-cols-1 gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold tracking-tight capitalize">
                  {formatDate(date, LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' })}
                </h2>
                <span className={cx('text-sm', entries.length > 0 && taken === entries.length ? 'text-accent' : 'text-ink-dim')}>
                  {entries.length === 0
                    ? t('history.nothing')
                    : t('history.summary', { taken, total: entries.length })}
                </span>
              </div>
              {entries.length > 0 && (
                <ul className="grid grid-cols-1 gap-1.5">
                  {entries.map((e) => {
                    const status = e.log?.status;
                    return (
                      <li key={e.key} className="flex items-center gap-2 text-sm">
                        <span
                          className={cx(
                            'h-6 w-6 shrink-0 grid place-items-center rounded-full',
                            status === 'taken' && 'bg-accent text-accent-contrast',
                            status === 'skipped' && 'bg-line text-ink-dim',
                            !status && 'border border-dashed border-ink-dim/50 text-ink-dim'
                          )}
                          title={t(status ? `history.${status}` : 'history.missed')}
                        >
                          {status === 'taken' && <Icon name="check" size={14} />}
                          {status === 'skipped' && <Icon name="skip" size={12} />}
                        </span>
                        <span className="tabular-nums text-ink-dim w-12 shrink-0">
                          {formatTime(e.time, settings.hourFormat)}
                        </span>
                        {people.length > 1 && personId === null && e.person && (
                          <PersonDot color={e.person.color} size={8} />
                        )}
                        <span className="truncate">
                          {e.medName}
                          {e.dose && <span className="text-ink-dim"> · {e.dose}</span>}
                        </span>
                        <span className="ml-auto text-xs text-ink-dim shrink-0">
                          {t(status ? `history.${status}` : 'history.missed')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
