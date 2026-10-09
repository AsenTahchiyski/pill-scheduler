# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A client-only medicine scheduling PWA (React 18 + TypeScript + Vite + Tailwind + Dexie), structured like `../fasting-timer`. No backend, and data never leaves the device; don't add network calls or analytics.

## Commands

- `npm run dev`: dev server on port 5173 (host-exposed)
- `npm run build`: typecheck (`tsc --noEmit`), then Vite build
- `npm run typecheck`: typecheck only

There are no tests and no linter; `npm run typecheck` is the verification gate. Deploys happen on push to `main`/`master` (GitHub Pages, `VITE_BASE` set by the workflow).

## Architecture

- `src/App.tsx` switches five tab screens (`src/screens/`) with local state; no router. All data comes from `useData()` (`dexie-react-hooks` live queries) and is passed down as props.
- **Data** (`src/db/`): tables `settings` (single row `'default'`), `people` (each with embedded `meals`), `medicines`, `doses` (taken/skipped log), `kv`. Schema changes need a new `this.version(n)` block. Never edit existing ones.
- **Scheduling** (`src/lib/schedule.ts`): pure functions with no Dexie dependency. `isActiveOn` (period + frequency), `doseTimes` (fixed times, or derived from the person's meals: before = meal start − offset, during = start, after = start + duration + offset), and `dayEntries`, which merges the schedule with dose logs for one date. Today, History, reminders and the ICS export all go through these.
- **Dose log ids** are `${medicineId}|${date}|${minutes}` (`doseKey`). Logs snapshot the medicine name and dose so history survives edits and deletes. Logs that no longer match the schedule still show up for their day.
- **Time model**: dates are local `YYYY-MM-DD` strings and clock times are minutes after midnight. Both are deliberately timezone-free. Helpers are in `src/lib/time.ts`.
- **Reminders** (`src/hooks/useReminders.ts`) only run while the app is open (no web API schedules notifications for a closed app). The reliable path is the `.ics` export in `src/lib/ics.ts` (floating times, RRULE, VALARM, UTF-8 octet folding). `public/notification-click.js` is imported into the generated service worker.
- **Backup**: same multi-layer scheme as fasting-timer (`main.tsx` bootstrap restore, `useAutoBackup`, `lib/backup.ts`, `lib/fileSync.ts`). The `ExportPayload` is `version: 1`; bump it and migrate if the shape changes.

## Conventions

- **i18n**: every user-facing string goes through `src/lib/i18n.ts`, with both `en` and `bg` entries. Default language is `bg`.
- **Theming**: use the Tailwind tokens (`accent`, `surface`, `ink`, `line`…), not hardcoded colors.
- Use `<Field group>` when a Field wraps buttons. A plain `<label>` forwards taps on its caption to the first button.
- Page and list grids use `grid-cols-1`. With an implicit `auto` column, truncated text inside a row widens the page past the viewport.
- Don't put framer-motion `layoutId` elements inside `Modal`. They kept `AnimatePresence` from removing the overlay, which then blocked all taps. That's why `Segmented` uses a CSS transform.
