import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { PersonDot, PersonFilter } from '../components/PersonFilter';
import type { Medicine, Person, Settings } from '../db/types';
import { useLang, useT } from '../lib/i18n';
import { formatDose, frequencyLabel, relationLabel, periodLabel, timesLabel } from '../lib/labels';
import { todayStr } from '../lib/time';
import { MedicineForm } from './MedicineForm';

interface Props {
  settings: Settings;
  people: Person[];
  medicines: Medicine[];
  /** Set by other screens to open the editor straight away. */
  openNew: boolean;
  onOpenedNew: () => void;
}

export function MedicinesScreen({ settings, people, medicines, openNew, onOpenedNew }: Props) {
  const t = useT();
  const [personId, setPersonId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Medicine | 'new' | null>(openNew ? 'new' : null);

  useEffect(() => {
    if (openNew) onOpenedNew();
  }, [openNew, onOpenedNew]);

  const today = todayStr();
  const shown = people.filter((p) => personId === null || p.id === personId);

  return (
    <div className="app-shell">
      <div className="max-w-md mx-auto p-5 pt-6 grid grid-cols-1 gap-5">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t('meds.title')}</h1>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Icon name="plus" size={18} /> {t('common.add')}
          </Button>
        </header>

        <PersonFilter people={people} value={personId} onChange={setPersonId} />

        {medicines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center grid gap-3 justify-items-center">
            <p className="text-ink-dim">{t('meds.empty')}</p>
            <Button onClick={() => setEditing('new')}>{t('meds.add')}</Button>
          </div>
        )}

        {shown.map((person) => {
          const list = medicines.filter((m) => m.personId === person.id);
          if (list.length === 0) return null;
          const current = list.filter((m) => !m.endDate || m.endDate >= today);
          const ended = list.filter((m) => m.endDate && m.endDate < today);
          return (
            <section key={person.id} className="grid grid-cols-1 gap-2">
              {people.length > 1 && (
                <h2 className="flex items-center gap-2 text-sm font-medium text-ink-dim">
                  <PersonDot color={person.color} /> {person.name}
                </h2>
              )}
              {current.map((m) => (
                <MedicineCard key={m.id} med={m} person={person} settings={settings} onClick={() => setEditing(m)} />
              ))}
              {ended.length > 0 && (
                <>
                  <h3 className="text-xs uppercase tracking-[0.14em] text-ink-dim mt-2">{t('meds.ended')}</h3>
                  {ended.map((m) => (
                    <MedicineCard key={m.id} med={m} person={person} settings={settings} onClick={() => setEditing(m)} />
                  ))}
                </>
              )}
            </section>
          );
        })}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && (
          <MedicineForm
            initial={editing === 'new' ? null : editing}
            people={people}
            defaultPersonId={personId ?? people[0]?.id ?? ''}
            hourFormat={settings.hourFormat}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function MedicineCard({
  med,
  person,
  settings,
  onClick
}: {
  med: Medicine;
  person: Person;
  settings: Settings;
  onClick: () => void;
}) {
  const lang = useLang();
  const today = todayStr();
  const ended = !!med.endDate && med.endDate < today;
  const relation = relationLabel(lang, med.timing);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border border-line bg-surface-2 p-4 grid grid-cols-1 gap-1.5 hover:border-accent/60 transition-colors ${ended ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-tight truncate">{med.name}</span>
        <span className="text-sm text-ink-dim truncate">· {formatDose(lang, med)}</span>
        <span className="ml-auto flex items-center gap-1.5 shrink-0 text-ink-dim">
          {med.reminders && <Icon name="bell" size={16} />}
        </span>
      </div>
      <div className="text-sm">
        <span className="font-medium">{timesLabel(med, person, settings.hourFormat)}</span>
        {relation && <span className="text-ink-dim"> · {relation}</span>}
      </div>
      <div className="text-xs text-ink-dim">
        {frequencyLabel(lang, med)} · {periodLabel(lang, med, today)}
      </div>
    </button>
  );
}
