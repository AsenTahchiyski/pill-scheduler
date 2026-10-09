import { motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';
import { TabBar, type TabId } from './components/TabBar';
import type { Settings } from './db/types';
import { useAutoBackup } from './hooks/useAutoBackup';
import { useData } from './hooks/useData';
import { useReminders } from './hooks/useReminders';
import type { PayloadData } from './lib/backup';
import { LanguageContext } from './lib/i18n';
import { HistoryScreen } from './screens/History';
import { MedicinesScreen } from './screens/Medicines';
import { PeopleScreen } from './screens/People';
import { SettingsScreen } from './screens/Settings';
import { TodayScreen } from './screens/Today';
import { ThemeProvider } from './theme/ThemeProvider';

export function App() {
  const { settings, people, medicines, doses, loading } = useData();
  const [tab, setTab] = useState<TabId>('today');
  const [openNewMed, setOpenNewMed] = useState(false);
  const clearOpenNew = useCallback(() => setOpenNewMed(false), []);

  const data = useMemo<PayloadData | undefined>(
    () => (settings && !loading ? { settings, people, medicines, doses } : undefined),
    [settings, people, medicines, doses, loading]
  );

  useAutoBackup(data);
  useReminders(settings?.language ?? 'bg', people, medicines, doses);

  if (!data) return <Splash />;
  const s: Settings = data.settings;

  return (
    <LanguageContext.Provider value={s.language}>
      <ThemeProvider accent={s.accentColor} mode={s.themeMode}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="accent-ambient"
        >
          {tab === 'today' && (
            <TodayScreen
              settings={s}
              people={people}
              medicines={medicines}
              doses={doses}
              onAddMedicine={() => {
                setOpenNewMed(true);
                setTab('meds');
              }}
              onOpenSettings={() => setTab('settings')}
            />
          )}
          {tab === 'meds' && (
            <MedicinesScreen
              settings={s}
              people={people}
              medicines={medicines}
              openNew={openNewMed}
              onOpenedNew={clearOpenNew}
            />
          )}
          {tab === 'history' && (
            <HistoryScreen settings={s} people={people} medicines={medicines} doses={doses} />
          )}
          {tab === 'people' && <PeopleScreen settings={s} people={people} medicines={medicines} />}
          {tab === 'settings' && <SettingsScreen data={data} />}
        </motion.div>
        <TabBar active={tab} onSelect={setTab} />
      </ThemeProvider>
    </LanguageContext.Provider>
  );
}

function Splash() {
  return (
    <div className="h-dvh grid place-items-center">
      <div className="h-10 w-10 rounded-full border-2 border-line border-t-accent animate-spin" />
    </div>
  );
}
