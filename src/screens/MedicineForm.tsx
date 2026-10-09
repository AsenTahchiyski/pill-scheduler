import { useState } from 'react';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PersonFilter } from '../components/PersonFilter';
import { Segmented } from '../components/Segmented';
import { Stepper } from '../components/Stepper';
import { deleteMedicine, saveMedicine } from '../db/db';
import type { FoodRelation, Frequency, HourFormat, Medicine, Person } from '../db/types';
import { cx } from '../lib/cx';
import { LOCALE, useLang, useT } from '../lib/i18n';
import { foodLabel } from '../lib/labels';
import { defaultTimes, PRESETS, type ScheduleFields } from '../lib/presets';
import { doseTimes } from '../lib/schedule';
import {
  addDays,
  daysBetween,
  formatDate,
  formatTime,
  fromHHMM,
  todayStr,
  toHHMM,
  WEEK_ORDER,
  weekdayName
} from '../lib/time';
import { uid } from '../lib/uid';

type EndMode = 'ongoing' | 'until' | 'days';

interface Props {
  initial: Medicine | null; // null = new
  people: Person[];
  defaultPersonId: string;
  hourFormat: HourFormat;
  onDone: () => void;
}

function blankMedicine(personId: string): Medicine {
  const now = Date.now();
  return {
    id: uid(),
    personId,
    name: '',
    dose: '',
    prescription: false,
    notes: '',
    startDate: todayStr(),
    endDate: null,
    frequency: { kind: 'daily' },
    timing: { mode: 'times', times: defaultTimes(1) },
    food: 'none',
    foodOffset: 30,
    reminders: true,
    createdAt: now,
    updatedAt: now
  };
}

export function MedicineForm({ initial, people, defaultPersonId, hourFormat, onDone }: Props) {
  const t = useT();
  const lang = useLang();
  const [d, setD] = useState<Medicine>(() => initial ?? blankMedicine(defaultPersonId));
  const [endMode, setEndMode] = useState<EndMode>(initial?.endDate ? 'until' : 'ongoing');
  const [daysCount, setDaysCount] = useState(() =>
    initial?.endDate ? daysBetween(initial.startDate, initial.endDate) + 1 : 7
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const person = people.find((p) => p.id === d.personId);
  const set = (patch: Partial<Medicine>) => setD((prev) => ({ ...prev, ...patch }));
  const setFreq = (frequency: Frequency) => set({ frequency });
  const endDate =
    endMode === 'ongoing'
      ? null
      : endMode === 'days'
        ? addDays(d.startDate, daysCount - 1)
        : (d.endDate ?? addDays(d.startDate, 6));
  const preview = doseTimes(d, person);
  const fmtDay = (s: string) =>
    formatDate(s, LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' });

  const applySchedule = (fields: ScheduleFields) => set(fields);

  const changePerson = (personId: string) => {
    const p = people.find((x) => x.id === personId);
    // Meal ids are per person, so re-point meal timing at the new person's meals.
    set(
      d.timing.mode === 'meals'
        ? { personId, timing: { mode: 'meals', mealIds: (p?.meals ?? []).map((m) => m.id) } }
        : { personId }
    );
  };

  const changeTimingMode = (mode: 'times' | 'meals') => {
    if (mode === d.timing.mode) return;
    if (mode === 'times') {
      set({ timing: { mode: 'times', times: preview.map((x) => x.time) } });
    } else {
      set({
        timing: { mode: 'meals', mealIds: (person?.meals ?? []).map((m) => m.id) },
        food: d.food === 'none' ? 'during' : d.food
      });
    }
  };

  const save = async () => {
    if (!d.name.trim()) return setError(t('med.err.name'));
    if (d.frequency.kind === 'weekdays' && d.frequency.days.length === 0)
      return setError(t('med.err.days'));
    if (preview.length === 0) return setError(t('med.err.times'));
    if (endDate && endDate < d.startDate) return setError(t('med.err.end'));
    const times = d.timing.mode === 'times' ? d.timing : null;
    await saveMedicine({
      ...d,
      name: d.name.trim(),
      dose: d.dose.trim(),
      notes: d.notes.trim(),
      endDate,
      timing: times ? { mode: 'times', times: [...new Set(times.times)].sort((a, b) => a - b) } : d.timing
    });
    onDone();
  };

  const remove = async () => {
    await deleteMedicine(d.id);
    onDone();
  };

  if (confirmDelete) {
    return (
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold tracking-tight">{t('med.delete.title')}</h3>
        <p className="text-sm text-ink-dim">{t('med.delete.sub', { name: d.name })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={remove}>
            {t('common.delete')}
          </Button>
        </div>
      </div>
    );
  }

  const section = 'grid gap-4 rounded-2xl border border-line bg-surface p-4';

  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold tracking-tight">
        {initial ? t('med.edit') : t('med.new')}
      </h3>

      {people.length > 1 && (
        <Field group label={t('med.person')}>
          <PersonFilter people={people} value={d.personId} allowAll={false} onChange={(id) => id && changePerson(id)} />
        </Field>
      )}

      <Field label={t('med.name')}>
        <input
          className="input"
          value={d.name}
          placeholder={t('med.namePh')}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label={t('med.dose')}>
        <input
          className="input"
          value={d.dose}
          placeholder={t('med.dosePh')}
          onChange={(e) => set({ dose: e.target.value })}
        />
      </Field>
      <Checkbox
        checked={d.prescription}
        onChange={(prescription) => set({ prescription })}
        label={t('med.prescription')}
      />

      <Field group label={t('med.presets')}>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applySchedule(p.apply(person))}
              className="h-9 px-3 rounded-full border border-line bg-surface text-sm hover:border-accent hover:text-accent transition-colors"
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </Field>

      {/* Period */}
      <div className={section}>
        <Field group label={t('med.period')}>
          <Segmented
            id="med-end"
            ariaLabel={t('med.period')}
            value={endMode}
            onChange={setEndMode}
            options={[
              { value: 'ongoing', label: t('med.end.ongoing') },
              { value: 'until', label: t('med.end.until') },
              { value: 'days', label: t('med.end.days') }
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('med.start')}>
            <input
              type="date"
              className="input"
              value={d.startDate}
              onChange={(e) => e.target.value && set({ startDate: e.target.value })}
            />
          </Field>
          {endMode === 'until' && (
            <Field label={t('med.endDate')}>
              <input
                type="date"
                className="input"
                value={endDate ?? ''}
                min={d.startDate}
                onChange={(e) => e.target.value && set({ endDate: e.target.value })}
              />
            </Field>
          )}
          {endMode === 'days' && (
            <Field label={t('med.daysCount')}>
              <input
                type="number"
                inputMode="numeric"
                className="input"
                min={1}
                max={365}
                value={daysCount}
                onChange={(e) => setDaysCount(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
              />
            </Field>
          )}
        </div>
        {endMode === 'days' && endDate && (
          <p className="text-sm text-ink-dim -mt-2">{t('med.lastDay', { date: fmtDay(endDate) })}</p>
        )}
      </div>

      {/* Frequency */}
      <div className={section}>
        <Field group label={t('med.frequency')}>
          <Segmented
            id="med-freq"
            ariaLabel={t('med.frequency')}
            value={d.frequency.kind}
            onChange={(kind) =>
              setFreq(
                kind === 'daily'
                  ? { kind }
                  : kind === 'weekdays'
                    ? { kind, days: d.frequency.kind === 'weekdays' ? d.frequency.days : [1, 3, 5] }
                    : { kind, everyDays: d.frequency.kind === 'interval' ? d.frequency.everyDays : 2 }
              )
            }
            options={[
              { value: 'daily', label: t('med.freq.daily') },
              { value: 'weekdays', label: t('med.freq.weekdays') },
              { value: 'interval', label: t('med.freq.interval') }
            ]}
          />
        </Field>
        {d.frequency.kind === 'weekdays' && (
          <WeekdayPicker
            days={d.frequency.days}
            onChange={(days) => setFreq({ kind: 'weekdays', days })}
            locale={LOCALE[lang]}
            countLabel={t('med.perWeek', { n: d.frequency.days.length })}
          />
        )}
        {d.frequency.kind === 'interval' && (
          <Field group label={t('med.everyDays')}>
            <Stepper
              ariaLabel={t('med.everyDays')}
              min={2}
              max={60}
              value={d.frequency.everyDays}
              onChange={(everyDays) => setFreq({ kind: 'interval', everyDays })}
            />
          </Field>
        )}
      </div>

      {/* Food */}
      <div className={section}>
        <Field group label={t('med.food')}>
          <Segmented<FoodRelation>
            id="med-food"
            ariaLabel={t('med.food')}
            value={d.food}
            onChange={(food) => set({ food })}
            options={(['none', 'before', 'during', 'after'] as const)
              .filter((f) => f !== 'none' || d.timing.mode === 'times')
              .map((f) => ({ value: f, label: t(`food.${f}`) }))}
          />
        </Field>
        {(d.food === 'before' || d.food === 'after') && (
          <Field group label={t('med.foodOffset', { rel: t(`med.foodOffset.${d.food}`) })}>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 15, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set({ foodOffset: m })}
                  className={cx(
                    'h-11 px-3 rounded-xl border text-sm font-medium',
                    d.foodOffset === m
                      ? 'border-accent text-accent bg-[rgb(var(--accent)/0.1)]'
                      : 'border-line bg-surface-2 text-ink-dim'
                  )}
                >
                  {m} {t('common.min')}
                </button>
              ))}
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={240}
                value={d.foodOffset}
                aria-label={t('med.foodOffset', { rel: t(`med.foodOffset.${d.food}`) })}
                onChange={(e) => set({ foodOffset: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })}
                className="h-11 w-20 text-center rounded-xl border border-line bg-surface-2"
              />
            </div>
          </Field>
        )}
      </div>

      {/* Times of day */}
      <div className={section}>
        <Field group label={t('med.timing')}>
          <Segmented
            id="med-timing"
            ariaLabel={t('med.timing')}
            value={d.timing.mode}
            onChange={changeTimingMode}
            options={[
              { value: 'times', label: t('med.timing.times') },
              { value: 'meals', label: t('med.timing.meals') }
            ]}
          />
        </Field>

        {d.timing.mode === 'times' ? (
          <TimesEditor
            times={d.timing.times}
            onChange={(times) => set({ timing: { mode: 'times', times } })}
          />
        ) : !person || person.meals.length === 0 ? (
          <p className="text-sm text-ink-dim">{t('med.noMeals')}</p>
        ) : (
          <Field group label={t('med.mealsPick')}>
            <div className="grid gap-3">
              {person.meals.map((meal) => {
                const ids = d.timing.mode === 'meals' ? d.timing.mealIds : [];
                const on = ids.includes(meal.id);
                return (
                  <Checkbox
                    key={meal.id}
                    checked={on}
                    onChange={(c) =>
                      set({
                        timing: {
                          mode: 'meals',
                          mealIds: c ? [...ids, meal.id] : ids.filter((x) => x !== meal.id)
                        }
                      })
                    }
                    label={meal.name}
                    hint={`${formatTime(meal.time, hourFormat)} · ${meal.duration} ${t('common.min')}`}
                  />
                );
              })}
            </div>
          </Field>
        )}

        <div className="rounded-xl bg-[rgb(var(--accent)/0.08)] px-3 py-2.5 text-sm">
          <span className="text-ink-dim">{t('med.preview')}: </span>
          {preview.length === 0 ? (
            <span className="text-ink-dim">{t('med.previewNone')}</span>
          ) : (
            preview.map((x, i) => (
              <span key={x.time}>
                {i > 0 && ', '}
                <span className="font-semibold">{formatTime(x.time, hourFormat)}</span>
                {x.meal && <span className="text-ink-dim"> ({foodLabel(lang, d, x.meal)})</span>}
              </span>
            ))
          )}
          {d.timing.mode === 'times' && d.food !== 'none' && (
            <div className="text-ink-dim mt-0.5">{foodLabel(lang, d)}</div>
          )}
        </div>
      </div>

      <Checkbox
        checked={d.reminders}
        onChange={(reminders) => set({ reminders })}
        label={
          <span className="inline-flex items-center gap-1.5">
            <Icon name="bell" size={18} /> {t('med.reminders')}
          </span>
        }
      />

      <Field label={t('med.notes')}>
        <textarea
          className="input"
          rows={2}
          value={d.notes}
          placeholder={t('med.notesPh')}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </Field>

      {error && <p className="text-sm text-[rgb(255,107,107)]">{error}</p>}

      <div className="flex gap-2">
        {initial && (
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

function WeekdayPicker({
  days,
  onChange,
  locale,
  countLabel
}: {
  days: number[];
  onChange: (days: number[]) => void;
  locale: string;
  countLabel: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_ORDER.map((day) => {
          const on = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? days.filter((x) => x !== day) : [...days, day].sort())}
              className={cx(
                'h-11 rounded-xl border text-sm font-medium capitalize',
                on ? 'border-accent bg-accent text-accent-contrast' : 'border-line bg-surface-2 text-ink-dim'
              )}
            >
              {weekdayName(day, locale).slice(0, 2)}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-ink-dim">{countLabel}</p>
    </div>
  );
}

function TimesEditor({ times, onChange }: { times: number[]; onChange: (t: number[]) => void }) {
  const t = useT();
  return (
    <div className="grid gap-3">
      <Field group label={t('med.timesPerDay')}>
        <Stepper
          ariaLabel={t('med.timesPerDay')}
          min={1}
          max={12}
          value={Math.max(1, times.length)}
          onChange={(n) => onChange(defaultTimes(n))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        {times.map((time, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              type="time"
              className="input"
              value={toHHMM(time)}
              onChange={(e) =>
                e.target.value && onChange(times.map((x, j) => (j === i ? fromHHMM(e.target.value) : x)))
              }
            />
            {times.length > 1 && (
              <button
                type="button"
                aria-label={t('common.remove')}
                onClick={() => onChange(times.filter((_, j) => j !== i))}
                className="h-12 w-9 shrink-0 grid place-items-center text-ink-dim hover:text-ink"
              >
                <Icon name="x" size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...times, Math.min(23 * 60, (times[times.length - 1] ?? 7 * 60) + 60)])}
      >
        <Icon name="plus" size={16} /> {t('med.addTime')}
      </Button>
    </div>
  );
}
