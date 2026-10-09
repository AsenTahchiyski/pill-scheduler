import type { HourFormat } from '../db/types';
import { cx } from '../lib/cx';

interface Props {
  value: number; // minutes after midnight
  onChange: (v: number) => void;
  hourFormat: HourFormat;
  ariaLabel?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Hour/minute picker that follows the app's 24h/12h setting. The native
 * <input type="time"> ignores it and uses the browser locale instead.
 */
export function TimeInput({ value, onChange, hourFormat, ariaLabel, className }: Props) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  // 5-minute steps, plus the current minute if it's off-step.
  const steps = Array.from({ length: 12 }, (_, i) => i * 5);
  const minutes = steps.includes(m) ? steps : [...steps, m].sort((a, b) => a - b);
  const select =
    'h-12 rounded-xl border border-line bg-surface text-base text-center appearance-none px-2 focus:outline-none focus:border-accent';

  const setHour = (hour: number) => onChange(hour * 60 + m);
  const setMinute = (minute: number) => onChange(h * 60 + minute);

  return (
    <div role="group" aria-label={ariaLabel} className={cx('flex items-center gap-1', className)}>
      {hourFormat === '24h' ? (
        <select className={select} value={h} aria-label="hour" onChange={(e) => setHour(Number(e.target.value))}>
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {pad(i)}
            </option>
          ))}
        </select>
      ) : (
        <select
          className={select}
          value={h % 12 || 12}
          aria-label="hour"
          onChange={(e) => setHour((Number(e.target.value) % 12) + (h >= 12 ? 12 : 0))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      )}
      <span className="text-ink-dim">:</span>
      <select className={select} value={m} aria-label="minute" onChange={(e) => setMinute(Number(e.target.value))}>
        {minutes.map((i) => (
          <option key={i} value={i}>
            {pad(i)}
          </option>
        ))}
      </select>
      {hourFormat === '12h' && (
        <select
          className={select}
          value={h >= 12 ? 'pm' : 'am'}
          aria-label="AM/PM"
          onChange={(e) => setHour((h % 12) + (e.target.value === 'pm' ? 12 : 0))}
        >
          <option value="am">AM</option>
          <option value="pm">PM</option>
        </select>
      )}
    </div>
  );
}
