/**
 * Pure maths for the habit tracker: dates, streaks, weekly completion,
 * heatmaps and 21-day challenges. No React, no storage, no `Date.now()`:
 * every function takes "today" as a date key so it is easy to test.
 *
 * Self-contained on purpose (type-only imports) so the unit tests can run it
 * with `node --experimental-strip-types`.
 */

import type { Challenge, Habit, HabitTarget } from "./types";

export const DAY_MS = 86_400_000;
export const CHALLENGE_LENGTH = 21;

/* ---------------- date keys (YYYY-MM-DD, calendar days) ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar day of a Date as a key. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function keyToUTC(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToKey(ms: number): string {
  const t = new Date(ms);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function addDays(key: string, n: number): string {
  return utcToKey(keyToUTC(key) + n * DAY_MS);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: string, b: string): number {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / DAY_MS);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekday(key: string): number {
  return (new Date(keyToUTC(key)).getUTCDay() + 6) % 7;
}

/** The Monday on or before `key`. */
export function weekStart(key: string): string {
  return addDays(key, -weekday(key));
}

/* ---------------- ticking ---------------- */

/** Adds or removes `day` from a sorted unique list of date keys. */
export function toggleDay(done: string[], day: string): string[] {
  const set = new Set(done);
  if (set.has(day)) set.delete(day);
  else set.add(day);
  return [...set].sort();
}

export function isDone(habit: Pick<Habit, "done">, day: string): boolean {
  return habit.done.includes(day);
}

/** Toggles a day on a habit, moving `createdOn` back if an earlier day is ticked. */
export function toggleHabitDay(habit: Habit, day: string): Habit {
  const done = toggleDay(habit.done, day);
  const createdOn = done.includes(day) && day < habit.createdOn ? day : habit.createdOn;
  return { ...habit, done, createdOn };
}

/* ---------------- streaks ---------------- */

export type Streaks = { current: number; best: number; unit: "day" | "week" };

/**
 * Consecutive done days. The current streak is still alive if today is not
 * ticked yet but yesterday was (the day is not over).
 */
export function dailyStreaks(done: string[], today: string): { current: number; best: number } {
  const set = new Set(done.filter((d) => d <= today));
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && diffDays(prev, day) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return { current, best: Math.max(best, current) };
}

/** Done-day counts per week, keyed by the week's Monday. */
export function weekCounts(done: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const day of done) {
    const wk = weekStart(day);
    counts.set(wk, (counts.get(wk) ?? 0) + 1);
  }
  return counts;
}

/**
 * Consecutive weeks that met the target. The current week only counts once
 * it is met; until then it does not break the streak.
 */
export function weeklyStreaks(done: string[], perWeek: number, today: string): { current: number; best: number } {
  const counts = weekCounts(done.filter((d) => d <= today));
  const thisWeek = weekStart(today);
  const met = (wk: string) => (counts.get(wk) ?? 0) >= perWeek;

  let cursor = met(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  let current = 0;
  while (met(cursor)) {
    current += 1;
    cursor = addDays(cursor, -7);
  }

  const weeks = [...counts.keys()].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const wk of weeks) {
    if (!met(wk)) {
      run = 0;
      prev = null;
      continue;
    }
    run = prev !== null && diffDays(prev, wk) === 7 ? run + 1 : 1;
    if (run > best) best = run;
    prev = wk;
  }
  return { current, best: Math.max(best, current) };
}

export function habitStreaks(habit: Pick<Habit, "done" | "target">, today: string): Streaks {
  if (habit.target.kind === "weekly") {
    return { ...weeklyStreaks(habit.done, habit.target.perWeek, today), unit: "week" };
  }
  return { ...dailyStreaks(habit.done, today), unit: "day" };
}

/* ---------------- recent days and weekly completion ---------------- */

export type DayCell = { date: string; done: boolean; isToday: boolean; beforeStart: boolean };

/** The last `n` days ending today, oldest first. */
export function lastNDays(habit: Pick<Habit, "done" | "createdOn">, today: string, n = 7): DayCell[] {
  const set = new Set(habit.done);
  const out: DayCell[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    out.push({ date, done: set.has(date), isToday: i === 0, beforeStart: date < habit.createdOn });
  }
  return out;
}

/**
 * Completion over the last 7 days, 0..1.
 * Daily: done days / days the habit existed in that window.
 * Weekly (N per week): done days / N, capped at 1.
 */
export function weekCompletion(habit: Pick<Habit, "done" | "createdOn" | "target">, today: string): number {
  const days = lastNDays(habit, today, 7);
  const doneCount = days.filter((d) => d.done).length;
  if (habit.target.kind === "weekly") {
    return Math.min(1, doneCount / Math.max(1, habit.target.perWeek));
  }
  const eligible = days.filter((d) => !d.beforeStart || d.done).length;
  return eligible === 0 ? 0 : Math.min(1, doneCount / eligible);
}

/** Done days in the current Monday-to-Sunday week. */
export function doneThisWeek(habit: Pick<Habit, "done">, today: string): number {
  const start = weekStart(today);
  return habit.done.filter((d) => d >= start && d <= today).length;
}

export function targetLabel(target: HabitTarget): string {
  if (target.kind === "daily") return "Every day";
  return `${target.perWeek} ${target.perWeek === 1 ? "day" : "days"} a week`;
}

/* ---------------- heatmap ---------------- */

export type HeatCell = { date: string; value: number; future: boolean };

/**
 * Columns of weeks (Monday first), oldest first, ending with the current
 * week. `valueFor` returns the cell value (0..1 for a ratio, or 0/1).
 */
export function heatmapWeeks(today: string, weeks: number, valueFor: (date: string) => number): HeatCell[][] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(first, w * 7 + d);
      const future = date > today;
      col.push({ date, value: future ? 0 : valueFor(date), future });
    }
    columns.push(col);
  }
  return columns;
}

/** Maps a 0..1 ratio to five shades (0 = none). */
export function heatLevel(ratio: number): 0 | 1 | 2 | 3 | 4 {
  if (!(ratio > 0)) return 0;
  if (ratio < 0.34) return 1;
  if (ratio < 0.67) return 2;
  if (ratio < 1) return 3;
  return 4;
}

/** Habits that existed (and were not archived) on `day`, and how many were done. */
export function dayTotals(habits: Habit[], day: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const h of habits) {
    if (h.archived) continue;
    const ticked = h.done.includes(day);
    if (h.createdOn > day && !ticked) continue;
    total += 1;
    if (ticked) done += 1;
  }
  return { done, total };
}

export function dayRatio(habits: Habit[], day: string): number {
  const { done, total } = dayTotals(habits, day);
  return total === 0 ? 0 : done / total;
}

/** Plain-language summary of a heatmap, used as its text equivalent. */
export function heatmapSummary(columns: HeatCell[][]): { activeDays: number; days: number; fullDays: number } {
  let activeDays = 0;
  let days = 0;
  let fullDays = 0;
  for (const col of columns) {
    for (const cell of col) {
      if (cell.future) continue;
      days += 1;
      if (cell.value > 0) activeDays += 1;
      if (cell.value >= 1) fullDays += 1;
    }
  }
  return { activeDays, days, fullDays };
}

/* ---------------- 21-day challenges ---------------- */

export function activeChallenge(habit: Pick<Habit, "challenges">): Challenge | undefined {
  return habit.challenges.find((c) => c.status === "active");
}

export type ChallengeProgress = {
  /** 1-based day number, capped at the challenge length. */
  day: number;
  /** Days ticked inside the challenge window, up to today. */
  doneCount: number;
  length: number;
  /** Past days in the window that were not ticked. */
  missed: number;
  /** 0..1 of the challenge length done. */
  ratio: number;
  /** True once the last day of the window is today or earlier. */
  windowOver: boolean;
  /** True when every day of the challenge has been ticked. */
  perfect: boolean;
};

export function challengeProgress(challenge: Challenge, done: string[], today: string): ChallengeProgress {
  const length = challenge.length;
  const last = addDays(challenge.start, length - 1);
  const end = challenge.endedOn && challenge.endedOn < today ? challenge.endedOn : today;
  const upTo = end < last ? end : last;
  const elapsed = Math.max(0, diffDays(challenge.start, upTo) + 1);
  const doneCount = done.filter((d) => d >= challenge.start && d <= upTo).length;
  const todayInWindow = today >= challenge.start && today <= last;
  // Today is not "missed" until it is over.
  const pastDays = todayInWindow && !done.includes(today) ? elapsed - 1 : elapsed;
  const day = Math.min(length, Math.max(1, diffDays(challenge.start, today) + 1));
  return {
    day,
    doneCount,
    length,
    missed: Math.max(0, pastDays - doneCount),
    ratio: Math.min(1, doneCount / length),
    windowOver: today >= last,
    perfect: doneCount >= length,
  };
}

export function startChallenge(habit: Habit, today: string, id: string): Habit {
  if (activeChallenge(habit)) return habit;
  const challenge: Challenge = { id, start: today, length: CHALLENGE_LENGTH, status: "active" };
  return { ...habit, challenges: [...habit.challenges, challenge] };
}

export function endChallenge(habit: Habit, status: "completed" | "stopped", today: string): Habit {
  return {
    ...habit,
    challenges: habit.challenges.map((c) => (c.status === "active" ? { ...c, status, endedOn: today } : c)),
  };
}

/* ---------------- milestones ---------------- */

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

/** Returns the streak if it is a milestone worth a word of encouragement. */
export function milestone(streak: number): number | null {
  return MILESTONES.includes(streak) ? streak : null;
}
