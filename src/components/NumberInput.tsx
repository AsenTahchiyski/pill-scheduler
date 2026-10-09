import { useEffect, useState } from 'react';
import { cx } from '../lib/cx';

interface Props {
  value: number | null;
  /** Receives null while the text is empty or not a valid number in range. */
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  decimal?: boolean;
  ariaLabel?: string;
  className?: string;
}

function parse(text: string, min: number, max: number, decimal: boolean): number | null {
  const s = text.trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  if (!decimal && !Number.isInteger(n)) return null;
  return n;
}

/**
 * Number field that never rewrites what the user is typing: it can be
 * emptied, and shows red while the text isn't a valid value (the parent gets
 * null and should block saving).
 */
export function NumberInput({ value, onChange, min, max, decimal = false, ariaLabel, className }: Props) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const invalid = parse(text, min, max, decimal) === null;

  // Follow outside changes (e.g. a quick-pick chip), not our own edits.
  useEffect(() => {
    if (value !== null && value !== parse(text, min, max, decimal)) setText(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parse(e.target.value, min, max, decimal));
      }}
      className={cx(
        'input text-center',
        invalid && '!border-[rgb(255,107,107)] bg-[rgb(255_107_107/0.08)]',
        className
      )}
    />
  );
}
