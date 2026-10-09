import { motion } from 'framer-motion';
import { cx } from '../lib/cx';
import { useT } from '../lib/i18n';
import { Icon, type IconName } from './Icon';

export type TabId = 'today' | 'meds' | 'history' | 'people' | 'settings';

const TABS: { id: TabId; labelKey: string; icon: IconName }[] = [
  { id: 'today', labelKey: 'tab.today', icon: 'today' },
  { id: 'meds', labelKey: 'tab.meds', icon: 'pill' },
  { id: 'history', labelKey: 'tab.history', icon: 'history' },
  { id: 'people', labelKey: 'tab.people', icon: 'people' },
  { id: 'settings', labelKey: 'tab.settings', icon: 'settings' }
];

interface Props {
  active: TabId;
  onSelect: (id: TabId) => void;
}

export function TabBar({ active, onSelect }: Props) {
  const t = useT();
  return (
    <nav aria-label="Primary" className="tab-bar fixed bottom-0 inset-x-0 z-30">
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="glass border border-line rounded-2xl shadow-[0_-2px_30px_-10px_rgb(0_0_0/0.2)] flex">
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                className={cx(
                  'relative flex-1 min-w-0 py-2.5 flex flex-col items-center gap-0.5 text-[11px] font-medium',
                  isActive ? 'text-accent' : 'text-ink-dim'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-1 rounded-xl bg-[rgb(var(--accent)/0.12)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">
                  <Icon name={tab.icon} size={22} />
                </span>
                <span className="relative truncate max-w-full px-1">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
