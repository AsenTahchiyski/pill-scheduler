import { useEffect, useRef } from 'react';
import type { HourFormat } from '../db/types';
import { cx } from '../lib/cx';

interface Props {
  value: number; // minutes after midnight
  onChange: (v: number) => void;
  hourFormat: HourFormat;
  ariaLabel?: string;
  className?: string;
}

const ITEM = 40; // px per row
const VISIBLE = 3; // rows shown; the middle one is selected

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad(i));
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i || 12)); // index = hour % 12
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

/** Scroll-wheel hour/minute picker that follows the app's 24h/12h setting. */
export function TimeWheel({ value, onChange, hourFormat, ariaLabel, className }: Props) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const pm = h >= 12;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx('relative flex items-center gap-1 rounded-xl border border-line bg-surface px-2', className)}
    >
      {/* Selection band behind the middle row. */}
      <div
        className="pointer-events-none absolute inset-x-1 rounded-lg bg-accent/15"
        style={{ top: ITEM * Math.floor(VISIBLE / 2), height: ITEM }}
      />
      {hourFormat === '24h' ? (
        <Column items={HOURS_24} index={h} ariaLabel="hour" onChange={(i) => onChange(i * 60 + m)} />
      ) : (
        <Column
          items={HOURS_12}
          index={h % 12}
          ariaLabel="hour"
          onChange={(i) => onChange((i + (pm ? 12 : 0)) * 60 + m)}
        />
      )}
      <span className="relative font-semibold text-ink-dim">:</span>
      <Column items={MINUTES} index={m} ariaLabel="minute" onChange={(i) => onChange(h * 60 + i)} />
      {hourFormat === '12h' && (
        <Column
          items={['AM', 'PM']}
          index={pm ? 1 : 0}
          ariaLabel="AM/PM"
          onChange={(i) => onChange(((h % 12) + i * 12) * 60 + m)}
        />
      )}
    </div>
  );
}

function Column({
  items,
  index,
  onChange,
  ariaLabel
}: {
  items: string[];
  index: number;
  onChange: (i: number) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  // Scroll settles after a delay; read the latest props then, not the ones
  // from the render that saw the first scroll event.
  const latest = useRef({ index, onChange });
  latest.current = { index, onChange };

  // Follow the value (initial mount and outside changes). Setting scrollTop
  // fires a scroll event, which then settles on the same index: a no-op.
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ITEM) !== index) el.scrollTop = index * ITEM;
  }, [index]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
      if (i !== latest.current.index) latest.current.onChange(i);
    }, 120);
  };

  const scrollTo = (i: number) => ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
  const edge = ITEM * Math.floor(VISIBLE / 2);

  return (
    <div
      ref={ref}
      role="listbox"
      tabIndex={0}
      aria-label={ariaLabel}
      onScroll={onScroll}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        scrollTo(Math.max(0, Math.min(items.length - 1, index + step)));
      }}
      className="relative no-scrollbar overflow-y-scroll snap-y snap-mandatory overscroll-contain w-12 focus:outline-none"
      style={{
        height: ITEM * VISIBLE,
        paddingBlock: edge,
        maskImage: 'linear-gradient(transparent, black 35%, black 65%, transparent)',
        WebkitMaskImage: 'linear-gradient(transparent, black 35%, black 65%, transparent)'
      }}
    >
      {items.map((label, i) => (
        <div
          key={i}
          role="option"
          aria-selected={i === index}
          onClick={() => scrollTo(i)}
          className={cx(
            'snap-center grid place-items-center text-lg tabular-nums cursor-pointer select-none',
            i === index ? 'font-semibold text-ink' : 'text-ink-dim'
          )}
          style={{ height: ITEM }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
