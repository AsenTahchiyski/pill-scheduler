import { cx } from '../lib/cx';
import { fromHHMM, toHHMM } from '../lib/time';

interface Props {
  value: number; // minutes after midnight
  onChange: (v: number) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Native time input: on Android it opens the clock dial (hour, then minutes).
 * Its 12h/24h display follows the device, not the app setting.
 */
export function TimeInput({ value, onChange, ariaLabel, className }: Props) {
  return (
    <input
      type="time"
      className={cx('input w-auto px-3', className)}
      value={toHHMM(value)}
      aria-label={ariaLabel}
      onChange={(e) => e.target.value && onChange(fromHHMM(e.target.value))}
    />
  );
}
