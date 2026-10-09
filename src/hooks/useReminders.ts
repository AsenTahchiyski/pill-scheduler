import { useEffect } from 'react';
import type { DoseLog, Language, Medicine, Person } from '../db/types';
import { formatDose, relationLabel } from '../lib/labels';
import { translate } from '../lib/i18n';
import { dayEntries } from '../lib/schedule';
import { minutesNow, todayStr } from '../lib/time';

// Browsers can't schedule notifications for a closed app, so reminders are
// checked while the app is open (or recently backgrounded and still alive).
// Doses more than this many minutes overdue don't trigger a notification.
const MAX_LATE_MIN = 60;
const NOTIFIED_KEY = 'pill-scheduler-notified';

function readNotified(today: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]') as string[];
    // Keys contain the date; drop older days.
    return new Set(raw.filter((k) => k.includes(`|${today}|`)));
  } catch {
    return new Set();
  }
}

function writeNotified(keys: Set<string>): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...keys]));
  } catch {
    // Ignore — worst case a reminder repeats.
  }
}

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function showNotification(title: string, body: string, tag: string) {
  const reg = await navigator.serviceWorker?.getRegistration();
  const opts: NotificationOptions & { vibrate?: number[] } = {
    body,
    tag,
    icon: 'icon.svg',
    badge: 'icon.svg',
    vibrate: [200, 100, 200]
  };
  if (reg) await reg.showNotification(title, opts);
  else new Notification(title, opts);
}

export function useReminders(
  lang: Language,
  people: Person[],
  medicines: Medicine[],
  doses: DoseLog[]
): void {
  useEffect(() => {
    if (!notificationsSupported()) return;

    const check = () => {
      if (Notification.permission !== 'granted') return;
      const today = todayStr();
      const now = minutesNow();
      const notified = readNotified(today);
      let changed = false;
      for (const e of dayEntries(today, people, medicines, doses)) {
        if (!e.med?.reminders || e.log || notified.has(e.key)) continue;
        if (e.time > now || now - e.time > MAX_LATE_MIN) continue;
        const title = e.person
          ? translate(lang, 'notif.titleFor', { med: e.medName, person: e.person.name })
          : e.medName;
        const body = [formatDose(lang, e.med), relationLabel(lang, e.med.timing, e.meal)]
          .filter(Boolean)
          .join(' · ');
        void showNotification(title, body, e.key);
        notified.add(e.key);
        changed = true;
      }
      if (changed) writeNotified(notified);
    };

    check();
    const id = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [lang, people, medicines, doses]);
}
