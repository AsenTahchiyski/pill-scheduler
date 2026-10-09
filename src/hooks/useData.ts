import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { DoseLog, Medicine, Person, Settings } from '../db/types';

export interface AppData {
  settings: Settings | undefined;
  people: Person[];
  medicines: Medicine[];
  doses: DoseLog[];
  loading: boolean;
}

// Stable empty value so memoized consumers don't re-run while loading.
const NONE: never[] = [];

/** Everything the screens render from; re-renders on any DB write. */
export function useData(): AppData {
  const settings = useLiveQuery(() => db.settings.get('default'), []);
  const people = useLiveQuery(() => db.people.orderBy('createdAt').toArray(), []);
  const medicines = useLiveQuery(
    async () => (await db.medicines.toArray()).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const doses = useLiveQuery(() => db.doses.toArray(), []);
  return {
    settings,
    people: people ?? NONE,
    medicines: medicines ?? NONE,
    doses: doses ?? NONE,
    loading: !settings || !people || !medicines || !doses
  };
}
