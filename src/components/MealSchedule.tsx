import { useState } from 'react';
import { savePerson } from '../db/db';
import type { Meal, Person } from '../db/types';
import { useT } from '../lib/i18n';
import { fromHHMM, toHHMM } from '../lib/time';
import { uid } from '../lib/uid';
import { Button } from './Button';
import { Field } from './Field';
import { Icon } from './Icon';
import { PersonFilter } from './PersonFilter';

/** Settings section: each person's meals (start + duration) and bedtime. */
export function MealSchedule({ people }: { people: Person[] }) {
  const t = useT();
  const [personId, setPersonId] = useState(people[0]?.id);
  const person = people.find((p) => p.id === personId) ?? people[0];
  if (!person) return null;
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-semibold tracking-tight">{t('settings.meals')}</h2>
        <p className="text-sm text-ink-dim mt-1">{t('settings.meals.sub')}</p>
      </div>
      <PersonFilter
        people={people}
        value={person.id}
        allowAll={false}
        onChange={(id) => id && setPersonId(id)}
      />
      {/* Remount per person so the local draft starts from their data. */}
      <PersonMeals key={person.id} person={person} />
    </div>
  );
}

function PersonMeals({ person }: { person: Person }) {
  const t = useT();
  // Inputs edit a local draft (no caret jumps from async DB round-trips);
  // every change is saved right away.
  const [draft, setDraft] = useState(person);
  const update = (next: Person) => {
    setDraft(next);
    void savePerson(next);
  };
  const setMeal = (id: string, patch: Partial<Meal>) =>
    update({ ...draft, meals: draft.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const cols = 'grid grid-cols-[1fr_6.25rem_3.5rem_1.5rem] gap-2 items-center';

  return (
    <div className="grid gap-4">
      <Field group label={t('people.meals')} hint={t('people.mealsHint')}>
        <div className="grid gap-2">
          {draft.meals.length === 0 ? (
            <p className="text-sm text-ink-dim">{t('people.noMeals')}</p>
          ) : (
            <div className={`${cols} text-xs text-ink-dim`}>
              <span>{t('people.mealName')}</span>
              <span>{t('people.mealTime')}</span>
              <span>{t('people.mealDuration')}</span>
            </div>
          )}
          {draft.meals.map((m) => (
            <div key={m.id} className={cols}>
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
                onClick={() => update({ ...draft, meals: draft.meals.filter((x) => x.id !== m.id) })}
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
              const last = Math.max(7 * 60, ...draft.meals.map((m) => m.time));
              update({
                ...draft,
                meals: [
                  ...draft.meals,
                  { id: uid(), name: t('people.mealName'), time: Math.min(23 * 60, last + 180), duration: 15 }
                ]
              });
            }}
          >
            <Icon name="plus" size={16} /> {t('people.addMeal')}
          </Button>
        </div>
      </Field>

      <Field label={t('people.bedtime')}>
        <input
          type="time"
          className="input w-40"
          value={toHHMM(draft.bedtime)}
          onChange={(e) => e.target.value && update({ ...draft, bedtime: fromHHMM(e.target.value) })}
        />
      </Field>
    </div>
  );
}
