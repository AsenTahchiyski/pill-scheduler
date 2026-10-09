import { motion } from 'framer-motion';
import { PRESET_ACCENTS } from '../lib/color';
import { cx } from '../lib/cx';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorSwatch({ value, onChange }: Props) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_ACCENTS.map((hex) => {
          const isActive = hex.toLowerCase() === value.toLowerCase();
          return (
            <motion.button
              type="button"
              key={hex}
              whileTap={{ scale: 0.92 }}
              onClick={() => onChange(hex)}
              aria-label={`Accent ${hex}`}
              className={cx(
                'h-9 w-9 rounded-full border-2 transition-colors',
                isActive ? 'border-ink' : 'border-transparent'
              )}
              style={{ backgroundColor: hex }}
            />
          );
        })}
        <label
          className={cx(
            'h-9 w-9 rounded-full grid place-items-center cursor-pointer border-2',
            'border-line bg-surface-2 text-ink-dim hover:text-ink'
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            aria-label="Custom accent color"
          />
        </label>
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-dim">
        <span
          aria-hidden
          className="h-4 w-4 rounded-full border border-line"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono">{value.toLowerCase()}</span>
      </div>
    </div>
  );
}
