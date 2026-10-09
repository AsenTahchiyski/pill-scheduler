interface Props {
  label: string;
  hint?: string;
  /**
   * Set for button groups: renders a div with role="group" instead of a
   * <label>, which would forward taps on its text to the first button.
   */
  group?: boolean;
  children: React.ReactNode;
}

export function Field({ label, hint, group, children }: Props) {
  const caption = (
    <span className="text-xs uppercase tracking-[0.14em] text-ink-dim font-medium">{label}</span>
  );
  const hintEl = hint && <span className="text-xs text-ink-dim">{hint}</span>;
  if (group) {
    return (
      <div role="group" aria-label={label} className="grid gap-1.5">
        {caption}
        {children}
        {hintEl}
      </div>
    );
  }
  return (
    <label className="grid gap-1.5">
      {caption}
      {children}
      {hintEl}
    </label>
  );
}
