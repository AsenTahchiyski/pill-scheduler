import { cx } from '../lib/cx';
import { Icon } from './Icon';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: string;
}

export function Checkbox({ checked, onChange, label, hint }: Props) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={cx(
          'mt-0.5 h-6 w-6 shrink-0 rounded-md border-2 grid place-items-center transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60',
          checked ? 'bg-accent border-accent text-accent-contrast' : 'border-line bg-surface'
        )}
      >
        {checked && <Icon name="check" size={16} />}
      </span>
      <span className="grid gap-0.5">
        <span className="text-base">{label}</span>
        {hint && <span className="text-xs text-ink-dim">{hint}</span>}
      </span>
    </label>
  );
}
