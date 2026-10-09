import { NumberInput } from './NumberInput';

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  ariaLabel: string;
}

export function Stepper({ value, onChange, min, max, ariaLabel }: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const btn =
    'h-11 w-11 shrink-0 rounded-xl border border-line bg-surface text-xl leading-none disabled:opacity-40';
  return (
    <div className="flex items-center gap-2" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={btn}
        disabled={value !== null && value <= min}
        onClick={() => onChange(clamp((value ?? min) - 1))}
      >
        −
      </button>
      <NumberInput value={value} onChange={onChange} min={min} max={max} ariaLabel={ariaLabel} className="!h-11 !w-16" />
      <button
        type="button"
        className={btn}
        disabled={value !== null && value >= max}
        onClick={() => onChange(clamp((value ?? min) + 1))}
      >
        +
      </button>
    </div>
  );
}
