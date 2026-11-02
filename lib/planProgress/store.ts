// Which sessions of a plan have been done, kept in the browser and synced
// with the account (see lib/sync).
//
// Shape: { [planId]: { [dayIndex]: { [itemId]: true } } }
// The reserved item id "day" marks the whole day as done. It is set when
// every session of the day is ticked (or the day is ticked on its own) and
// cleared as soon as any session is unticked.
import { markChanged } from "@/lib/sync/client";

export const PLAN_PROGRESS_KEY = "lifeengine.planprogress.v1";
/** Item id that marks a whole day as done. */
export const DAY_DONE = "day";
/** Fired on window after every write, so open views stay in step. */
export const PLAN_PROGRESS_EVENT = "lifeengine:planprogress";

export type DayProgress = Record<string, true>;
export type PlanProgress = Record<string, DayProgress>;
export type ProgressStore = Record<string, PlanProgress>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Read the whole store. Safe to call during SSR (returns {}). */
export function readProgressStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PLAN_PROGRESS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return isObject(parsed) ? (parsed as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeProgressStore(store: ProgressStore) {
  try {
    window.localStorage.setItem(PLAN_PROGRESS_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked: the tick still shows for this visit.
  }
  markChanged(PLAN_PROGRESS_KEY);
  window.dispatchEvent(new Event(PLAN_PROGRESS_EVENT));
}

export function readPlanProgress(planId: string): PlanProgress {
  const plan = readProgressStore()[planId];
  return isObject(plan) ? plan : {};
}

function updateDay(planId: string, dayIndex: number, change: (day: DayProgress) => DayProgress): PlanProgress {
  const store = readProgressStore();
  const plan: PlanProgress = isObject(store[planId]) ? { ...store[planId] } : {};
  const key = String(dayIndex);
  const next = change(isObject(plan[key]) ? { ...plan[key] } : {});
  if (Object.keys(next).length) plan[key] = next;
  else delete plan[key];
  if (Object.keys(plan).length) store[planId] = plan;
  else delete store[planId];
  writeProgressStore(store);
  return plan;
}

/**
 * Tick or untick one session. `allItemIds` is every session of that day, so
 * the day is marked done when the last one is ticked.
 */
export function setItemDone(planId: string, dayIndex: number, itemId: string, done: boolean, allItemIds: string[]) {
  return updateDay(planId, dayIndex, (day) => {
    if (done) {
      day[itemId] = true;
      if (allItemIds.length && allItemIds.every((id) => day[id])) day[DAY_DONE] = true;
    } else {
      delete day[itemId];
      delete day[DAY_DONE];
    }
    return day;
  });
}

/** Mark a whole day done (ticks every session) or not done (clears the day). */
export function setDayDone(planId: string, dayIndex: number, done: boolean, allItemIds: string[]) {
  return updateDay(planId, dayIndex, () => {
    if (!done) return {};
    const day: DayProgress = { [DAY_DONE]: true };
    allItemIds.forEach((id) => (day[id] = true));
    return day;
  });
}
