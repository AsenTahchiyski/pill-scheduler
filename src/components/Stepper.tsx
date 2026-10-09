interface Props {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  ariaLabel: string;
}

export function Stepper({ value, onChange, min, max, ariaLabel }: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const btn =
    'h-11 w-11 rounded-xl border border-line bg-surface text-xl leading-none disabled:opacity-40';
  return (
    <div className="flex items-center gap-2" role="group" aria-label={ariaLabel}>
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="h-11 w-16 text-center rounded-xl border border-line bg-surface text-base font-medium"
      />
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        +
      </button>
    </div>
  );
}
