import { LOCALE, useLang } from '../lib/i18n';
import { formatDate } from '../lib/time';
import { NativePicker } from './NativePicker';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  ariaLabel?: string;
  className?: string;
}

/** Shows the date in the app language; tapping opens the native calendar. */
export function DateInput({ value, onChange, min, max, ariaLabel, className }: Props) {
  const lang = useLang();
  return (
    <NativePicker
      type="date"
      value={value}
      display={formatDate(value, LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' })}
      onChange={onChange}
      min={min}
      max={max}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
