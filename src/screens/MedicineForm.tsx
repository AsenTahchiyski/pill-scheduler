import { useState } from 'react';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { PersonFilter } from '../components/PersonFilter';
import { Segmented } from '../components/Segmented';
import { NumberInput } from '../components/NumberInput';
import { Stepper } from '../components/Stepper';
import { TimeInput } from '../components/TimeInput';
import { deleteMedicine, saveMedicine } from '../db/db';
import type { DoseUnit, FoodRelation, Frequency, HourFormat, Medicine, Person, Timing } from '../db/types';
import { cx } from '../lib/cx';
import { LOCALE, useLang, useT } from '../lib/i18n';
import { googleCalendarUrl } from '../lib/gcal';
import { DOSE_UNITS, relationLabel } from '../lib/labels';
import { defaultTimes, EVERY_8H, OFTEN_COUNTS, oftenOf, type Often } from '../lib/presets';
import { doseTimes } from '../lib/schedule';
import {
  addDays,
  daysBetween,
  formatDate,
  formatTime,
  todayStr,
  WEEK_ORDER,
  weekdayName
} from '../lib/time';
import { uid } from '../lib/uid';

type EndMode = 'ongoing' | 'until' | 'days';
type Relation = 'none' | FoodRelation | 'sleep';

const RELATIONS: Relation[] = ['none', 'before', 'during', 'after', 'sleep'];
const OFTENS: Often[] = [...OFTEN_COUNTS, 'every8h', 'custom'];

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
    doseAmount: 1,
    doseUnit: 'pill',
    notes: '',
    startDate: todayStr(),
    endDate: null,
    frequency: { kind: 'daily' },
    timing: { mode: 'times', times: defaultTimes(1) },
    reminders: true,
    createdAt: now,
    updatedAt: now
  };
}

interface TimingState {
  often: Often;
  relation: Relation;
  offset: number | null; // null while the minutes field is invalid
  times: number[];
}

/** Splits a stored timing into the form's independent "how often" and "relation" choices. */
function timingState(timing: Timing): TimingState {
  if (timing.mode === 'times') {
    return { often: oftenOf(timing), relation: 'none' as Relation, offset: 30, times: timing.times };
  }
  if (timing.mode === 'sleep') {
    return { often: 1 as Often, relation: 'sleep' as Relation, offset: timing.offset, times: defaultTimes(1) };
  }
  const count = Math.min(3, Math.max(1, timing.count)) as 1 | 2 | 3;
  return { often: count as Often, relation: timing.relation as Relation, offset: timing.offset, times: defaultTimes(count) };
}

export function MedicineForm({ initial, people, defaultPersonId, hourFormat, onDone }: Props) {
  const t = useT();
  const lang = useLang();
  const [d, setD] = useState<Medicine>(() => initial ?? blankMedicine(defaultPersonId));
  const [endMode, setEndMode] = useState<EndMode>(initial?.endDate ? 'until' : 'ongoing');
  const [daysCount, setDaysCount] = useState<number | null>(() =>
    initial?.endDate ? daysBetween(initial.startDate, initial.endDate) + 1 : 7
  );
  const [timing, setTiming] = useState(() => timingState(d.timing));
  // Number fields are null while empty/invalid; saving is blocked until fixed.
  const [dose, setDose] = useState<number | null>(d.doseAmount);
  const [everyDays, setEveryDays] = useState<number | null>(
    d.frequency.kind === 'interval' ? d.frequency.everyDays : 2
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
        ? daysCount === null
          ? null
          : addDays(d.startDate, daysCount - 1)
        : (d.endDate ?? addDays(d.startDate, 6));
  const fmtDay = (s: string) =>
    formatDate(s, LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' });

  const builtTiming: Timing =
    timing.relation === 'none'
      ? { mode: 'times', times: timing.times }
      : timing.relation === 'sleep'
        ? { mode: 'sleep', offset: timing.offset ?? 0 }
        : {
            mode: 'meals',
            count: typeof timing.often === 'number' ? timing.often : 1,
            relation: timing.relation,
            offset: timing.relation === 'during' ? 0 : (timing.offset ?? 0)
          };
  const preview = doseTimes(builtTiming, person);
  const mealCount = person?.meals.length ?? 0;
  const needsOffset =
    timing.relation === 'before' || timing.relation === 'after' || timing.relation === 'sleep';
  const invalid =
    dose === null ||
    (endMode === 'days' && daysCount === null) ||
    (d.frequency.kind === 'interval' && everyDays === null) ||
    (needsOffset && timing.offset === null);

  // Choices adjust each other: meal relations need 1–3× a day and
  // "before sleep" is once a day.
  const chooseOften = (often: Often) => {
    const relation =
      (timing.relation === 'sleep' && often !== 1) ||
      (timing.relation !== 'none' && typeof often !== 'number')
        ? 'none'
        : timing.relation;
    const times =
      often === 'every8h' ? EVERY_8H : often === 'custom' ? timing.times : defaultTimes(often);
    setTiming({ ...timing, often, relation, times });
  };
  const chooseRelation = (relation: Relation) => {
    let often = timing.often;
    if (relation === 'sleep') often = 1;
    else if (relation !== 'none' && typeof often !== 'number') often = 1;
    const offset = relation === 'before' || relation === 'after' ? 30 : 0;
    const times = typeof often === 'number' && often !== timing.often ? defaultTimes(often) : timing.times;
    setTiming({ often, relation, offset, times });
  };

  // The medicine as it would be saved (used by Save and the calendar links).
  const draft: Medicine = {
    ...d,
    name: d.name.trim(),
    doseAmount: dose ?? 1,
    frequency: d.frequency.kind === 'interval' ? { kind: 'interval', everyDays: everyDays ?? 2 } : d.frequency,
    notes: d.notes.trim(),
    endDate,
    timing:
      builtTiming.mode === 'times'
        ? { mode: 'times', times: [...new Set(builtTiming.times)].sort((a, b) => a - b) }
        : builtTiming
  };
  const canExport =
    !invalid &&
    !!draft.name &&
    preview.length > 0 &&
    (d.frequency.kind !== 'weekdays' || d.frequency.days.length > 0) &&
    !(endDate && endDate < d.startDate);

  const save = async () => {
    if (invalid || dose === null) return;
    if (!d.name.trim()) return setError(t('med.err.name'));
    if (d.frequency.kind === 'weekdays' && d.frequency.days.length === 0)
      return setError(t('med.err.days'));
    if (preview.length === 0) return setError(t('med.err.times'));
    if (endDate && endDate < d.startDate) return setError(t('med.err.end'));
    await saveMedicine(draft);
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
  const chip = (active: boolean) =>
    cx(
      'h-10 px-3 rounded-full border text-sm font-medium transition-colors',
      active
        ? 'border-accent bg-accent text-accent-contrast'
        : 'border-line bg-surface-2 text-ink-dim hover:border-accent/50'
    );
  const oftenLabel = (o: Often) =>
    typeof o === 'number' ? t('often.n', { n: o }) : t(`often.${o}`);

  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold tracking-tight">
        {initial ? t('med.edit') : t('med.new')}
      </h3>

      {people.length > 1 && (
        <Field group label={t('med.person')}>
          <PersonFilter
            people={people}
            value={d.personId}
            allowAll={false}
            onChange={(id) => id && set({ personId: id })}
          />
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

      <Field group label={t('med.dose')}>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <NumberInput
            decimal
            min={0.01}
            max={1000}
            ariaLabel={t('med.amount')}
            value={dose}
            onChange={setDose}
          />
          <select
            className="input"
            aria-label={t('med.unit')}
            value={d.doseUnit}
            onChange={(e) => set({ doseUnit: e.target.value as DoseUnit })}
          >
            {DOSE_UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`unit.${u}.label`)}
              </option>
            ))}
          </select>
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
              <NumberInput min={1} max={365} value={daysCount} onChange={setDaysCount} />
            </Field>
          )}
        </div>
        {endMode === 'ongoing' && <p className="text-sm text-ink-dim -mt-2">{t('med.end.ongoingHint')}</p>}
        {endMode === 'days' && endDate && (
          <p className="text-sm text-ink-dim -mt-2">{t('med.lastDay', { date: fmtDay(endDate) })}</p>
        )}
      </div>

      {/* Which days */}
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
                    : { kind, everyDays: everyDays ?? 2 }
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
              value={everyDays}
              onChange={setEveryDays}
            />
          </Field>
        )}
      </div>

      {/* Time of day: how often + relation to food / sleep */}
      <div className={section}>
        <Field group label={t('med.often')}>
          <div className="flex flex-wrap gap-2">
            {OFTENS.map((o) => (
              <button key={o} type="button" aria-pressed={timing.often === o} className={chip(timing.often === o)} onClick={() => chooseOften(o)}>
                {oftenLabel(o)}
              </button>
            ))}
          </div>
        </Field>

        <Field group label={t('med.relation')}>
          <div className="flex flex-wrap gap-2">
            {RELATIONS.map((r) => (
              <button key={r} type="button" aria-pressed={timing.relation === r} className={chip(timing.relation === r)} onClick={() => chooseRelation(r)}>
                {t(`rel.${r}`)}
              </button>
            ))}
          </div>
        </Field>

        {(timing.relation === 'before' || timing.relation === 'after' || timing.relation === 'sleep') && (
          <Field group label={t(`med.offset.${timing.relation}`)}>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 15, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTiming({ ...timing, offset: m })}
                  className={cx(
                    'h-11 px-3 rounded-xl border text-sm font-medium',
                    timing.offset === m
                      ? 'border-accent text-accent bg-[rgb(var(--accent)/0.1)]'
                      : 'border-line bg-surface-2 text-ink-dim'
                  )}
                >
                  {m} {t('common.min')}
                </button>
              ))}
              <NumberInput
                min={0}
                max={240}
                value={timing.offset}
                ariaLabel={t(`med.offset.${timing.relation}`)}
                onChange={(offset) => setTiming({ ...timing, offset })}
                className="!h-11 !w-20"
              />
            </div>
          </Field>
        )}

        {timing.relation === 'none' && (
          <TimesEditor
            times={timing.times}
            hourFormat={hourFormat}
            editableCount={timing.often === 'custom'}
            onChange={(times) => setTiming({ ...timing, times })}
          />
        )}

        {timing.relation !== 'none' && timing.relation !== 'sleep' && typeof timing.often === 'number' && timing.often > mealCount && (
          <p className="text-sm text-[rgb(255,107,107)]">
            {mealCount === 0
              ? t('med.noMeals', { name: person?.name ?? '' })
              : t('med.fewerMeals', { name: person?.name ?? '', n: mealCount })}
          </p>
        )}

        <div className="rounded-xl bg-[rgb(var(--accent)/0.08)] px-3 py-2.5 text-sm grid gap-0.5">
          <div>
            <span className="text-ink-dim">{t('med.preview')}: </span>
            {preview.length === 0 ? (
              <span className="text-ink-dim">{t('med.previewNone')}</span>
            ) : (
              preview.map((x, i) => (
                <span key={x.time}>
                  {i > 0 && ', '}
                  <span className="font-semibold">{formatTime(x.time, hourFormat)}</span>
                  {x.meal && <span className="text-ink-dim"> ({relationLabel(lang, builtTiming, x.meal)})</span>}
                </span>
              ))
            )}
          </div>
          {timing.relation === 'sleep' && person && (
            <div className="text-ink-dim">
              {relationLabel(lang, builtTiming)} · {t('med.bedtimeIs', { time: formatTime(person.bedtime, hourFormat) })}
            </div>
          )}
          {timing.relation !== 'none' && <div className="text-xs text-ink-dim">{t('med.scheduleInSettings')}</div>}
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

      {canExport && (
        <Field group label={t('med.gcal')} hint={t('med.gcal.hint')}>
          <div className="flex flex-wrap gap-2">
            {preview.map((dose) => {
              const url = googleCalendarUrl(lang, draft, person, dose);
              return (
                url && (
                  <a
                    key={dose.time}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-3 rounded-full border border-line bg-surface text-sm font-medium inline-flex items-center gap-1.5 hover:border-accent hover:text-accent transition-colors"
                  >
                    <Icon name="today" size={16} />
                    {preview.length > 1
                      ? formatTime(dose.time, hourFormat)
                      : t('med.gcal.add')}
                  </a>
                )
              );
            })}
          </div>
        </Field>
      )}

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
        <Button className="flex-1" disabled={invalid} onClick={save}>
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

function TimesEditor({
  times,
  hourFormat,
  editableCount,
  onChange
}: {
  times: number[];
  hourFormat: HourFormat;
  editableCount: boolean;
  onChange: (t: number[]) => void;
}) {
  const t = useT();
  return (
    <Field group label={t('med.times')}>
      <div className="grid gap-2">
        <div className={hourFormat === '12h' ? 'grid gap-2' : 'grid grid-cols-2 gap-2'}>
          {times.map((time, i) => (
            <div key={i} className="flex items-center gap-1">
              <TimeInput
                value={time}
                hourFormat={hourFormat}
                onChange={(v) => onChange(times.map((x, j) => (j === i ? v : x)))}
              />
              {editableCount && times.length > 1 && (
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
        {editableCount && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange([...times, Math.min(23 * 60, (times[times.length - 1] ?? 7 * 60) + 60)])}
          >
            <Icon name="plus" size={16} /> {t('med.addTime')}
          </Button>
        )}
      </div>
    </Field>
  );
}
