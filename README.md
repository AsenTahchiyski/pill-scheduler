# Pill Scheduler

A mobile-friendly **PWA** for scheduling medicines, prescription or not, for the
whole family. No backend: everything is stored on the device (IndexedDB via
Dexie). Bulgarian and English.

<img width="216" height="468" alt="Screenshot_20261023_164926_Brave" src="https://github.com/user-attachments/assets/a2274f8d-0857-4391-86b8-b0c2ef1569c9" />
<img width="216" height="468" alt="Screenshot_20261023_164942_Brave" src="https://github.com/user-attachments/assets/d95f9508-b280-465b-8ecb-3cdcebfbff36" />
<img width="216" height="468" alt="Screenshot_20261023_164953_Brave" src="https://github.com/user-attachments/assets/98ca858e-1b94-4a32-b846-391ed182c9b7" />
<img width="216" height="468" alt="Screenshot_20261023_165010_Brave" src="https://github.com/user-attachments/assets/8d1475a9-cc32-4a75-9d89-ff845bb27148" />

## Features

- **Several people** (you, a child, a parent…), each with their own medicines.
- **Meal schedule per person** (Settings): any number of meals, each with a
  start time and a duration, plus a bedtime. One person can skip dinner while
  another has five meals.
- **Medicines**: add, edit or delete at any time. Each has a name, a dose
  (amount in ½ steps + pill / drop / spray / ml / vial) and notes.
  - **Period**: no end date, until a date, or for N days.
  - **Days**: every day, chosen weekdays (N× per week), or every N days.
  - **How often**: 1×, 2× or 3× a day, every 8 hours, or your own times.
  - **Food / sleep**: any time, before / with / after food, or before sleep,
    with minutes. Doses tied to food land on that person's meals from Settings
    (1× = first meal, 2× = first and last, 3× = spread across the day). "After"
    counts from the *end* of the meal (start + duration). Changing the meal
    schedule moves those doses too. Tap the person's meal chips to pick the
    exact meals instead (e.g. move "with food" to lunch).
  - **Show reminders** checkbox.
  - Optional **Add to Google Calendar** buttons: one per dose time, each
    opening Google Calendar with a pre-filled repeating event to confirm.
- **Today** (home screen): the day's doses for everyone or one person. Mark each
  dose taken or skipped, see what's next and what's overdue, and browse other
  days. Tap "Taken HH:MM" to correct when a dose was taken (time and day).
- **History**: the last 14 days, taken / skipped / not marked. A mark can be
  deleted.
- On Android, **back** closes the open dialog, then returns to Today, and only
  leaves the app from Today.

## Reminders, and their limits

Browsers can't schedule a notification for a web app that is closed. Reminders
therefore fire **while the app is open or recently used** (Settings → enable
notifications). For alarms that always ring, use **Settings → Export to
calendar (.ics)**. It creates a repeating event with an alarm for every dose of
the medicines with reminders on. Export again after changing schedules or meal
times. Events have stable UIDs, so calendars that support it update them
instead of duplicating. The per-medicine Google Calendar buttons are an
alternative for Google Calendar users.

## Data safety

The same layered approach as fasting-timer: persistent-storage request, an
automatic localStorage mirror and a private backup file in browser storage
(OPFS), and manual JSON export/import.

### Sync file

In Chromium desktop browsers (Chrome, Edge), Settings → Data → Sync file links
the app to a JSON file you choose. Settings, people, medicines and dose history
are kept in that file and changes flow both ways, so several devices that link
the same file share one data set. The app itself only reads and writes the
local file; moving it between devices is up to a sync client you already run,
such as Synology Drive, Google Drive, OneDrive, Dropbox or Syncthing. Data then
leaves your device only through that client.

- On the first device choose "Create new…" and save the file in the synced
  folder; on the others choose "Open existing…" and pick the same file. Linking
  an existing file merges it with the data already on the device; a device with
  no medicines or dose history yet simply adopts the file.
- The file is re-checked on every change, whenever the app comes back to the
  foreground, and on "Sync now". If both sides changed since the last sync, the
  newer one wins.
- With Google Drive, prefer "Mirror files" mode (or mark the file "Available
  offline"); with OneDrive, set the file to "Always keep on this device".
- After a browser restart, tap "Allow access" once to resume syncing.
- Mobile browsers can't link a file; use Export / Import there.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Pushing to `main`/`master` deploys to GitHub Pages via
`.github/workflows/deploy.yml`.
