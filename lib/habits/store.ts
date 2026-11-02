/**
 * localStorage persistence for habits. Browser only: call from effects or
 * event handlers, never during render. Every access is wrapped so blocked
 * storage (private mode, quota) degrades to an in-memory session.
 */

import { isDateKey } from "./logic";
import type { Challenge, Habit, HabitColor, HabitIcon, HabitsState } from "./types";

export const HABITS_KEY = "lifeengine.habits.v1";

const COLORS: HabitColor[] = ["indigo", "emerald", "amber", "rose", "lime", "slate"];
const ICONS: HabitIcon[] = [
  "droplets",
  "footprints",
  "wind",
  "moon",
  "candy-off",
  "book-open",
  "sun",
  "person-standing",
  "dumbbell",
  "apple",
  "brain",
  "leaf",
  "heart",
  "monitor-off",
  "coffee",
  "salad",
];

export const emptyHabits = (): HabitsState => ({ version: 1, habits: [] });

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanChallenge(raw: unknown): Challenge | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<Challenge>;
  if (typeof c.id !== "string" || !isDateKey(c.start)) return null;
  const status = c.status === "completed" || c.status === "stopped" ? c.status : "active";
  return {
    id: c.id,
    start: c.start,
    length: typeof c.length === "number" && c.length > 0 ? Math.round(c.length) : 21,
    status,
    endedOn: isDateKey(c.endedOn) ? c.endedOn : undefined,
  };
}

/** Accepts anything and returns a valid habit, or null if it is beyond repair. */
export function cleanHabit(raw: unknown): Habit | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Partial<Habit>;
  if (typeof h.id !== "string" || typeof h.name !== "string" || !h.name.trim()) return null;
  const target =
    h.target && h.target.kind === "weekly" && typeof h.target.perWeek === "number"
      ? { kind: "weekly" as const, perWeek: Math.min(6, Math.max(1, Math.round(h.target.perWeek))) }
      : { kind: "daily" as const };
  const done = Array.isArray(h.done) ? [...new Set(h.done.filter(isDateKey))].sort() : [];
  const challenges = Array.isArray(h.challenges)
    ? h.challenges.map(cleanChallenge).filter((c): c is Challenge => c !== null)
    : [];
  // At most one active challenge.
  let seenActive = false;
  for (const c of challenges) {
    if (c.status !== "active") continue;
    if (seenActive) c.status = "stopped";
    seenActive = true;
  }
  return {
    id: h.id,
    name: h.name.trim().slice(0, 80),
    icon: ICONS.includes(h.icon as HabitIcon) ? (h.icon as HabitIcon) : "leaf",
    color: COLORS.includes(h.color as HabitColor) ? (h.color as HabitColor) : "indigo",
    target,
    reminder: typeof h.reminder === "string" && h.reminder.trim() ? h.reminder.trim().slice(0, 80) : undefined,
    createdOn: isDateKey(h.createdOn) ? h.createdOn : done[0] ?? "1970-01-01",
    archived: h.archived === true,
    done,
    challenges,
    templateId: typeof h.templateId === "string" ? h.templateId : undefined,
  };
}

export type LoadResult = { state: HabitsState; error: string | null };

export function loadHabits(): LoadResult {
  if (typeof window === "undefined") return { state: emptyHabits(), error: null };
  try {
    const raw = window.localStorage.getItem(HABITS_KEY);
    if (!raw) return { state: emptyHabits(), error: null };
    const parsed = JSON.parse(raw) as Partial<HabitsState>;
    const habits = Array.isArray(parsed?.habits)
      ? parsed.habits.map(cleanHabit).filter((h): h is Habit => h !== null)
      : [];
    return { state: { version: 1, habits }, error: null };
  } catch {
    return {
      state: emptyHabits(),
      error: "Saved habits could not be read in this browser. New changes will still be saved.",
    };
  }
}

/** Returns false when the browser refused the write. */
export function saveHabits(state: HabitsState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(HABITS_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
