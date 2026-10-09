import { NumberInput } from './NumberInput';

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  decimal?: boolean;
  ariaLabel: string;
}

export function Stepper({ value, onChange, min, max, step = 1, decimal, ariaLabel }: Props) {
  // Round to the step so 1.5 − 0.5 doesn't drift to 0.9999….
  const snap = (v: number) => Math.round(v / step) * step;
  const btn =
    'h-11 w-11 shrink-0 rounded-xl border border-line bg-surface text-xl leading-none disabled:opacity-40';
  return (
    <div className="flex items-center gap-2" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={btn}
        disabled={value !== null && value - step < min}
        onClick={() => onChange(value === null ? Math.max(min, step) : Math.max(min, snap(value - step)))}
      >
        −
      </button>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        decimal={decimal}
        ariaLabel={ariaLabel}
        className="!h-11 !w-16"
      />
      <button
        type="button"
        className={btn}
        disabled={value !== null && value + step > max}
        onClick={() => onChange(value === null ? Math.max(min, step) : Math.min(max, snap(value + step)))}
      >
        +
      </button>
    </div>
  );
}
