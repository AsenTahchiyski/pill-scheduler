import type { HourFormat } from '../db/types';
import { formatTime, fromHHMM, toHHMM } from '../lib/time';
import { NativePicker } from './NativePicker';

interface Props {
  value: number; // minutes after midnight
  onChange: (v: number) => void;
  hourFormat: HourFormat;
  ariaLabel?: string;
  className?: string;
}

/**
 * Shows the time in the app's 12h/24h format; tapping opens the native picker
 * (on Android, the clock dial). The dial itself follows the device setting.
 */
export function TimeInput({ value, onChange, hourFormat, ariaLabel, className }: Props) {
  return (
    <NativePicker
      type="time"
      value={toHHMM(value)}
      display={formatTime(value, hourFormat)}
      onChange={(v) => onChange(fromHHMM(v))}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
