import { LANGUAGES } from '../lib/i18n';
import type { Language } from '../db/types';
import { cx } from '../lib/cx';

interface Props {
  value: Language;
  onChange: (lang: Language) => void;
}

export function LanguagePicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Language" className="grid gap-2">
      {LANGUAGES.map((lang) => {
        const active = lang.code === value;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(lang.code)}
            className={cx(
              'w-full h-14 px-4 rounded-xl border text-left flex items-center gap-3 transition-colors',
              active
                ? 'border-accent bg-[rgb(var(--accent)/0.08)] text-accent'
                : 'border-line bg-surface text-ink hover:border-accent/50'
            )}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {lang.flag}
            </span>
            <span className="text-base font-medium tracking-tight">
              {lang.nativeName}
            </span>
            {active && (
              <svg
                className="ml-auto"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
