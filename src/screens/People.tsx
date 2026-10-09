import { useState } from 'react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { PersonDot } from '../components/PersonFilter';
import { defaultMeals, deletePerson, newPerson, PERSON_COLORS, savePerson } from '../db/db';
import type { Medicine, Person, Settings } from '../db/types';
import { cx } from '../lib/cx';
import { useLang, useT } from '../lib/i18n';
import { formatTime, fromHHMM, toHHMM } from '../lib/time';
import { uid } from '../lib/uid';

interface Props {
  settings: Settings;
  people: Person[];
  medicines: Medicine[];
}

export function PeopleScreen({ settings, people, medicines }: Props) {
  const t = useT();
  const lang = useLang();
  const [editing, setEditing] = useState<{ person: Person; isNew: boolean } | null>(null);

  return (
    <div className="app-shell">
      <div className="max-w-md mx-auto p-5 pt-6 grid grid-cols-1 gap-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('people.title')}</h1>
            <p className="text-sm text-ink-dim mt-1">{t('people.sub')}</p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => setEditing({ person: newPerson(lang, '', people.length), isNew: true })}
          >
            <Icon name="plus" size={18} /> {t('common.add')}
          </Button>
        </header>

        {people.map((p) => {
          const n = medicines.filter((m) => m.personId === p.id).length;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setEditing({ person: p, isNew: false })}
              className="text-left rounded-2xl border border-line bg-surface-2 p-4 grid gap-2 hover:border-accent/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <PersonDot color={p.color} size={14} />
                <span className="font-semibold tracking-tight">{p.name}</span>
                <span className="ml-auto text-sm text-ink-dim">
                  {n === 1 ? t('people.medCountOne') : t('people.medCount', { n })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-ink-dim">
                {p.meals.length === 0 && t('people.noMeals')}
                {[...p.meals]
                  .sort((a, b) => a.time - b.time)
                  .map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
                      <Icon name="food" size={12} /> {m.name} {formatTime(m.time, settings.hourFormat)}
                    </span>
                  ))}
              </div>
            </button>
          );
        })}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        {editing && (
          <PersonForm
            initial={editing.person}
            isNew={editing.isNew}
            canDelete={people.length > 1}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function PersonForm({
  initial,
  isNew,
  canDelete,
  onDone
}: {
  initial: Person;
  isNew: boolean;
  canDelete: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [p, setP] = useState<Person>(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setMeal = (id: string, patch: Partial<Person['meals'][number]>) =>
    setP((prev) => ({ ...prev, meals: prev.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));

  const save = async () => {
    if (!p.name.trim()) return setError(t('people.err.name'));
    await savePerson({
      ...p,
      name: p.name.trim(),
      meals: p.meals
        .map((m) => ({ ...m, name: m.name.trim() || t('people.mealName') }))
        .sort((a, b) => a.time - b.time)
    });
    onDone();
  };

  if (confirmDelete) {
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold tracking-tight">{t('people.delete.title')}</h3>
        <p className="text-sm text-ink-dim">{t('people.delete.sub', { name: initial.name })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await deletePerson(initial.id);
              onDone();
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold tracking-tight">{isNew ? t('people.new') : t('people.edit')}</h3>

      <Field label={t('people.name')}>
        <input
          className="input"
          value={p.name}
          placeholder={t('people.namePh')}
          onChange={(e) => setP({ ...p, name: e.target.value })}
        />
      </Field>

      <Field group label={t('people.color')}>
        <div className="flex flex-wrap gap-2">
          {PERSON_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={c === p.color}
              onClick={() => setP({ ...p, color: c })}
              className={cx('h-9 w-9 rounded-full border-2', c === p.color ? 'border-ink' : 'border-transparent')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Field>

      <Field group label={t('people.meals')} hint={t('people.mealsHint')}>
        <div className="grid gap-2">
          {p.meals.length > 0 && (
            <div className="grid grid-cols-[1fr_6.5rem_4.5rem_2rem] gap-2 text-xs text-ink-dim">
              <span>{t('people.mealName')}</span>
              <span>{t('people.mealTime')}</span>
              <span>{t('people.mealDuration')}</span>
            </div>
          )}
          {p.meals.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_6.5rem_4.5rem_2rem] gap-2 items-center">
              <input
                className="input min-w-0"
                value={m.name}
                aria-label={t('people.mealName')}
                onChange={(e) => setMeal(m.id, { name: e.target.value })}
              />
              <input
                type="time"
                className="input px-2"
                value={toHHMM(m.time)}
                aria-label={t('people.mealTime')}
                onChange={(e) => e.target.value && setMeal(m.id, { time: fromHHMM(e.target.value) })}
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={240}
                className="input text-center px-1"
                value={m.duration}
                aria-label={t('people.mealDuration')}
                onChange={(e) =>
                  setMeal(m.id, { duration: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })
                }
              />
              <button
                type="button"
                aria-label={t('common.remove')}
                onClick={() => setP({ ...p, meals: p.meals.filter((x) => x.id !== m.id) })}
                className="h-12 grid place-items-center text-ink-dim hover:text-ink"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const last = p.meals[p.meals.length - 1];
              const meal = last
                ? { id: uid(), name: '', time: Math.min(23 * 60, last.time + 180), duration: 15 }
                : defaultMeals(lang)[0];
              setP({ ...p, meals: [...p.meals, meal] });
            }}
          >
            <Icon name="plus" size={16} /> {t('people.addMeal')}
          </Button>
        </div>
      </Field>

      {error && <p className="text-sm text-[rgb(255,107,107)]">{error}</p>}

      <div className="flex gap-2">
        {!isNew && canDelete && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label={t('common.delete')}>
            <Icon name="trash" />
          </Button>
        )}
        <Button variant="ghost" className="flex-1" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button className="flex-1" onClick={save}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
