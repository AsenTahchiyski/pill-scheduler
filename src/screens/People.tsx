import { useState } from 'react';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { PersonDot } from '../components/PersonFilter';
import { deletePerson, newPerson, PERSON_COLORS, savePerson } from '../db/db';
import type { Medicine, Person } from '../db/types';
import { cx } from '../lib/cx';
import { useLang, useT } from '../lib/i18n';

interface Props {
  people: Person[];
  medicines: Medicine[];
}

export function PeopleScreen({ people, medicines }: Props) {
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
              className="text-left rounded-2xl border border-line bg-surface-2 p-4 flex items-center gap-2.5 hover:border-accent/60 transition-colors"
            >
              <PersonDot color={p.color} size={14} />
              <span className="font-semibold tracking-tight truncate">{p.name}</span>
              <span className="ml-auto text-sm text-ink-dim shrink-0">
                {n === 1 ? t('people.medCountOne') : t('people.medCount', { n })}
              </span>
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
  const [p, setP] = useState<Person>(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!p.name.trim()) return setError(t('people.err.name'));
    await savePerson({ ...p, name: p.name.trim() });
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

      {isNew && <p className="text-sm text-ink-dim">{t('people.mealsInSettings')}</p>}

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
