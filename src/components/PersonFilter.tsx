import type { Person } from '../db/types';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';

interface Props {
  people: Person[];
  value: string | null; // null = everyone
  onChange: (id: string | null) => void;
  allowAll?: boolean;
}

/** Horizontal chip row for choosing a person. Hidden when there's only one. */
export function PersonFilter({ people, value, onChange, allowAll = true }: Props) {
  const t = useT();
  if (people.length < 2) return null;
  const chip = (active: boolean) =>
    cx(
      'shrink-0 h-9 px-3.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors',
      active
        ? 'border-accent bg-[rgb(var(--accent)/0.12)] text-accent'
        : 'border-line bg-surface-2 text-ink-dim'
    );
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {allowAll && (
        <button type="button" className={chip(value === null)} onClick={() => onChange(null)}>
          {t('common.all')}
        </button>
      )}
      {people.map((p) => (
        <button
          key={p.id}
          type="button"
          className={chip(value === p.id)}
          onClick={() => onChange(p.id)}
        >
          <PersonDot color={p.color} />
          {p.name}
        </button>
      ))}
    </div>
  );
}

export function PersonDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block rounded-full shrink-0"
      style={{ backgroundColor: color, width: size, height: size }}
    />
  );
}
