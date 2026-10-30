import { useRef } from 'react';
import { cx } from '../lib/cx';

interface Props {
  type: 'time' | 'date';
  value: string;
  /** Text shown in the box, formatted by the app (not the browser). */
  display: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * A button showing the formatted value; tapping it opens the native picker
 * (on Android, the clock dial or calendar). The native input stays hidden
 * behind it, so its segments can't be selected and its display doesn't
 * override the app's 12h/24h setting.
 */
export function NativePicker({ type, value, display, onChange, min, max, ariaLabel, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };
  return (
    <div className={cx('relative', className)}>
      <button
        type="button"
        onClick={open}
        aria-label={ariaLabel && `${ariaLabel}: ${display}`}
        className="input text-left whitespace-nowrap"
      >
        {display}
      </button>
      <input
        ref={ref}
        type={type}
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </div>
  );
}
