# Pill Scheduler

A mobile-friendly **PWA** for scheduling medicines, prescription or not, for the
whole family. No backend: everything is stored on the device (IndexedDB via
Dexie). Bulgarian and English.

## Features

- **Several people** (you, a child, a parent…), each with their own medicines.
- **Usual meal times per person**, with any number of meals, each with a start
  time and a duration. Medicines can be scheduled from them.
- **Medicines**: add, edit or delete at any time. Each has a name, dose, a
  prescription flag and notes.
  - **Period**: ongoing, until a date, or for N days.
  - **Days**: every day, chosen weekdays (N× per week), or every N days.
  - **Times**: N times per day at set clock times, or at chosen meals.
  - **Food**: any time, before, during or after food, with minutes for
    before/after. "After" counts from the *end* of the meal (start + duration).
  - **Quick schedules**: once/twice/3× a day, every 8 h, before/with/after
    meals, at bedtime, every other day, once a week.
  - **Show reminders** checkbox.
- **Today** (home screen): the day's doses for everyone or one person. Mark each
  dose taken or skipped, see what's next and what's overdue, and browse other
  days.
- **History**: the last 14 days, taken / skipped / not marked.

## Reminders, and their limits

Browsers can't schedule a notification for a web app that is closed. Reminders
therefore fire **while the app is open or recently used** (Settings → enable
notifications). For alarms that always ring, use **Settings → Export to
calendar (.ics)**. It creates a repeating event with an alarm for every dose of
the medicines with reminders on. Export again after changing schedules or meal
times. Events have stable UIDs, so calendars that support it update them
instead of duplicating.

## Data safety

The same layered approach as fasting-timer: persistent-storage request, an
automatic localStorage mirror and backup file (OPFS, or a file you choose on
Chromium), and manual JSON export/import.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Pushing to `main`/`master` deploys to GitHub Pages via
`.github/workflows/deploy.yml`.
