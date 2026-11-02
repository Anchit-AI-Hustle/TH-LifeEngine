// Browser-stored data that follows the account (see app/api/me/data).
export const SYNCED_KEYS = [
  'lifeengine.habits.v1',
  'lifeengine.sleep.v1',
  'lifeengine.planprogress.v1',
  'lifeengine.diet.v1',
  'th_fitness_profiles',
  'th_fitness_plans',
  'th_fitness_logs',
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
export type SyncedDocs = Partial<Record<string, { value: unknown; updatedAt: number }>>;

export function isSyncedKey(key: string): key is SyncedKey {
  return (SYNCED_KEYS as readonly string[]).includes(key);
}
