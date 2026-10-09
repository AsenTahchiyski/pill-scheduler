import { cx } from '../lib/cx';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<Option<T>>;
  ariaLabel?: string;
  id?: string;
}

// The sliding pill is a CSS transform, not a framer-motion layoutId: a
// layoutId inside a closing Modal kept AnimatePresence from ever removing
// the (invisible) overlay, which then swallowed every tap.
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  id
}: Props<T>) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      id={id}
      className="relative flex p-1 rounded-xl bg-surface border border-line"
    >
      {index >= 0 && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-1 rounded-lg bg-accent transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${index * 100}%)`
          }}
        />
      )}
      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative flex-1 min-w-0 h-9 px-1 text-sm font-medium rounded-lg transition-colors truncate',
              isActive ? 'text-accent-contrast' : 'text-ink-dim'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
