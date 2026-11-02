/**
 * localStorage persistence for the sleep log. Browser only: call from effects
 * or event handlers, never during render.
 */

import { DEFAULT_GOAL_MINUTES, isClock, isDateKey, TAG_LABELS } from "./logic";
import type { SleepEntry, SleepQuality, SleepState, SleepTag } from "./types";

export const SLEEP_KEY = "lifeengine.sleep.v1";

export const emptySleep = (): SleepState => ({ version: 1, goalMinutes: DEFAULT_GOAL_MINUTES, entries: [] });

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cleanEntry(raw: unknown): SleepEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<SleepEntry>;
  if (typeof e.id !== "string" || !isDateKey(e.night) || !isClock(e.bedtime) || !isClock(e.wake)) return null;
  const quality = Math.min(5, Math.max(1, Math.round(Number(e.quality) || 3))) as SleepQuality;
  const tags = Array.isArray(e.tags) ? [...new Set(e.tags.filter((t): t is SleepTag => t in TAG_LABELS))] : [];
  return {
    id: e.id,
    night: e.night,
    bedtime: e.bedtime,
    wake: e.wake,
    quality,
    tags,
    notes: typeof e.notes === "string" ? e.notes.slice(0, 500) : "",
    updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : new Date(0).toISOString(),
  };
}

export type LoadResult = { state: SleepState; error: string | null };

export function loadSleep(): LoadResult {
  if (typeof window === "undefined") return { state: emptySleep(), error: null };
  try {
    const raw = window.localStorage.getItem(SLEEP_KEY);
    if (!raw) return { state: emptySleep(), error: null };
    const parsed = JSON.parse(raw) as Partial<SleepState>;
    const goal = Number(parsed?.goalMinutes);
    const entries = Array.isArray(parsed?.entries)
      ? parsed.entries.map(cleanEntry).filter((e): e is SleepEntry => e !== null)
      : [];
    // One entry per night; keep the most recently updated.
    const byNight = new Map<string, SleepEntry>();
    for (const e of entries) {
      const prev = byNight.get(e.night);
      if (!prev || prev.updatedAt < e.updatedAt) byNight.set(e.night, e);
    }
    return {
      state: {
        version: 1,
        goalMinutes: goal >= 240 && goal <= 720 ? goal : DEFAULT_GOAL_MINUTES,
        entries: [...byNight.values()].sort((a, b) => (a.night < b.night ? 1 : -1)),
      },
      error: null,
    };
  } catch {
    return { state: emptySleep(), error: "Your saved sleep log could not be read in this browser. New entries will still be saved." };
  }
}

/** Returns false when the browser refused the write. */
export function saveSleep(state: SleepState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(SLEEP_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
