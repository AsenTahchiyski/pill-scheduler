import { useState } from 'react';
import { savePerson } from '../db/db';
import type { HourFormat, Meal, Person } from '../db/types';
import { useT } from '../lib/i18n';
import { uid } from '../lib/uid';
import { Button } from './Button';
import { Field } from './Field';
import { Icon } from './Icon';
import { NumberInput } from './NumberInput';
import { PersonFilter } from './PersonFilter';
import { TimeInput } from './TimeInput';

/** Settings section: each person's meals (start + duration) and bedtime. */
export function MealSchedule({ people, hourFormat }: { people: Person[]; hourFormat: HourFormat }) {
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
      <PersonMeals key={person.id} person={person} hourFormat={hourFormat} />
    </div>
  );
}

function PersonMeals({ person, hourFormat }: { person: Person; hourFormat: HourFormat }) {
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

  return (
    <div className="grid gap-4">
      <Field group label={t('people.meals')} hint={t('people.mealsHint')}>
        <div className="grid gap-2">
          {draft.meals.length === 0 && <p className="text-sm text-ink-dim">{t('people.noMeals')}</p>}
          {draft.meals.map((m) => (
            <div key={m.id} className="grid gap-2 rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <input
                  className="input min-w-0 flex-1"
                  value={m.name}
                  aria-label={t('people.mealName')}
                  onChange={(e) => setMeal(m.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  aria-label={t('common.remove')}
                  onClick={() => update({ ...draft, meals: draft.meals.filter((x) => x.id !== m.id) })}
                  className="h-12 w-9 shrink-0 grid place-items-center text-ink-dim hover:text-ink"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <div className="grid gap-1">
                  <span className="text-xs text-ink-dim">{t('people.mealTime')}</span>
                  <TimeInput
                    value={m.time}
                    hourFormat={hourFormat}
                    ariaLabel={t('people.mealTime')}
                    onChange={(time) => setMeal(m.id, { time })}
                  />
                </div>
                <div className="grid gap-1">
                  <span className="text-xs text-ink-dim">{t('people.mealDuration')}</span>
                  <NumberInput
                    min={0}
                    max={240}
                    value={m.duration}
                    ariaLabel={t('people.mealDuration')}
                    // Invalid text shows red and isn't saved; the last valid value stays.
                    onChange={(duration) => duration !== null && setMeal(m.id, { duration })}
                    className="!w-20"
                  />
                </div>
              </div>
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

      <Field group label={t('people.bedtime')}>
        <TimeInput
          value={draft.bedtime}
          hourFormat={hourFormat}
          ariaLabel={t('people.bedtime')}
          onChange={(bedtime) => update({ ...draft, bedtime })}
        />
      </Field>
    </div>
  );
}
