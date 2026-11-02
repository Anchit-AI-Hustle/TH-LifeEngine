/**
 * Pure maths for the sleep log: durations across midnight, averages,
 * bedtime consistency, sleep debt and plain-language tips. No React, no
 * storage, no clock: "today" is always passed in.
 *
 * Self-contained on purpose (type-only imports) so the unit tests can run it
 * with `node --experimental-strip-types`.
 */

import type { SleepEntry, SleepTag } from "./types";

export const DEFAULT_GOAL_MINUTES = 480;
const DAY_MIN = 1440;
const DAY_MS = 86_400_000;

/* ---------------- dates ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");

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

export function addDays(key: string, n: number): string {
  const t = new Date(keyToUTC(key) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 = Sunday ... 6 = Saturday, for a date key. */
export function dayOfWeek(key: string): number {
  return new Date(keyToUTC(key)).getUTCDay();
}

/** The night you are most likely logging: last night before 6 pm, tonight after. */
export function defaultNight(now: Date): string {
  const today = dateKey(now);
  return now.getHours() >= 18 ? today : addDays(today, -1);
}

/* ---------------- clock maths ---------------- */

export function isClock(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** "23:30" -> 1410 minutes after midnight. */
export function parseClock(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes asleep from bedtime to wake time; wraps past midnight. 0 when equal. */
export function durationMinutes(bedtime: string, wake: string): number {
  return (parseClock(wake) - parseClock(bedtime) + DAY_MIN) % DAY_MIN;
}

/**
 * Bedtime on a noon-to-noon axis so 23:00 and 01:00 are two hours apart, not
 * 22. Times before noon count as after midnight (1440 + minutes).
 */
export function bedtimeAxis(bedtime: string): number {
  const m = parseClock(bedtime);
  return m < 720 ? m + DAY_MIN : m;
}

/** 7h 5m, 45m, 8h. Negative values are shown as their size. */
export function formatDuration(minutes: number): string {
  const total = Math.round(Math.abs(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** 1410 -> "11:30 pm". Accepts axis values over 1440. */
export function formatClock(minutes: number): string {
  const m = ((Math.round(minutes) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(min)} ${suffix}`;
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Population standard deviation. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
}

/* ---------------- validation ---------------- */

export type EntryCheck = { error: string | null; warning: string | null; minutes: number };

export function checkEntry(input: { night: string; bedtime: string; wake: string }, today: string): EntryCheck {
  if (!isDateKey(input.night)) return { error: "Choose the night you are logging.", warning: null, minutes: 0 };
  if (input.night > today) return { error: "That night has not happened yet.", warning: null, minutes: 0 };
  if (!isClock(input.bedtime) || !isClock(input.wake)) {
    return { error: "Enter both a bedtime and a wake time.", warning: null, minutes: 0 };
  }
  const minutes = durationMinutes(input.bedtime, input.wake);
  if (minutes === 0) return { error: "Bedtime and wake time cannot be the same.", warning: null, minutes };
  if (minutes > 16 * 60) {
    return { error: `That is ${formatDuration(minutes)}. Check am and pm on both times.`, warning: null, minutes };
  }
  const warning = minutes < 3 * 60 ? "That is a very short night. Check the times if it is a mistake." : null;
  return { error: null, warning, minutes };
}

/* ---------------- windows and insights ---------------- */

/**
 * The `days` nights shown in charts and insights, oldest first. Ends with
 * tonight if it is already logged, otherwise last night.
 */
export function windowNights(entries: Pick<SleepEntry, "night">[], today: string, days: number): string[] {
  const end = entries.some((e) => e.night === today) ? today : addDays(today, -1);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) out.push(addDays(end, -i));
  return out;
}

export function entriesIn(entries: SleepEntry[], nights: string[]): SleepEntry[] {
  const set = new Set(nights);
  return entries.filter((e) => set.has(e.night));
}

export const TAG_LABELS: Record<SleepTag, string> = {
  caffeine: "Caffeine late",
  screens: "Screen time in bed",
  workout: "Workout",
  stress: "Stress",
  "late-meal": "Late heavy meal",
  alcohol: "Alcohol",
  nap: "Daytime nap",
};

/** What to try when a tag goes with worse sleep. */
const TAG_ADVICE: Record<SleepTag, string> = {
  caffeine: "Try keeping tea and coffee before 2 pm.",
  screens: "Try putting the phone away 30 minutes before bed.",
  workout: "Try finishing workouts at least 3 hours before bed.",
  stress: "A 5-minute breathing practice or writing tomorrow's to-do list before bed can help.",
  "late-meal": "Try eating dinner 2 to 3 hours before bed.",
  alcohol: "Even one drink fragments sleep later in the night.",
  nap: "Keep naps under 30 minutes and before 3 pm.",
};

export type TagEffect = {
  tag: SleepTag;
  withCount: number;
  withoutCount: number;
  /** Average minutes with the tag minus without (negative = less sleep). */
  durationDiff: number;
  /** Average quality with the tag minus without (negative = worse). */
  qualityDiff: number;
};

/** Compares nights with and without each tag. Needs two of each to say anything. */
export function tagEffects(entries: SleepEntry[]): TagEffect[] {
  const tags = Object.keys(TAG_LABELS) as SleepTag[];
  const out: TagEffect[] = [];
  for (const tag of tags) {
    const withTag = entries.filter((e) => e.tags.includes(tag));
    const without = entries.filter((e) => !e.tags.includes(tag));
    if (withTag.length < 2 || without.length < 2) continue;
    const dur = (list: SleepEntry[]) => mean(list.map((e) => durationMinutes(e.bedtime, e.wake)));
    const q = (list: SleepEntry[]) => mean(list.map((e) => e.quality));
    out.push({
      tag,
      withCount: withTag.length,
      withoutCount: without.length,
      durationDiff: dur(withTag) - dur(without),
      qualityDiff: q(withTag) - q(without),
    });
  }
  return out;
}

export type SleepTip = { id: string; tone: "good" | "info" | "warn"; text: string };

export type SleepInsights = {
  nights: number;
  windowDays: number;
  avgMinutes: number;
  avgQuality: number;
  /** Standard deviation of bedtime, minutes. */
  bedtimeSpread: number;
  /** Axis minutes (may exceed 1440); format with formatClock. */
  avgBedtime: number;
  avgWake: number;
  /** Total minutes short of the goal across logged nights (net of extra sleep, never below 0). */
  debtMinutes: number;
  shortNights: number;
  consistency: "steady" | "fair" | "irregular" | "unknown";
  tips: SleepTip[];
};

export function consistencyLabel(spread: number, nights: number): SleepInsights["consistency"] {
  if (nights < 3) return "unknown";
  if (spread <= 30) return "steady";
  if (spread <= 60) return "fair";
  return "irregular";
}

export function computeInsights(
  all: SleepEntry[],
  opts: { today: string; days: number; goalMinutes: number },
): SleepInsights {
  const nights = windowNights(all, opts.today, opts.days);
  const entries = entriesIn(all, nights);
  const durations = entries.map((e) => durationMinutes(e.bedtime, e.wake));
  const beds = entries.map((e) => bedtimeAxis(e.bedtime));
  const wakes = entries.map((e) => parseClock(e.wake));
  const goal = opts.goalMinutes;

  const avgMinutes = mean(durations);
  const avgQuality = mean(entries.map((e) => e.quality));
  const bedtimeSpread = stdDev(beds);
  const avgBedtime = mean(beds);
  const debtMinutes = Math.max(0, durations.reduce((sum, d) => sum + (goal - d), 0));
  const shortNights = durations.filter((d) => d < goal - 30).length;

  const insights: SleepInsights = {
    nights: entries.length,
    windowDays: opts.days,
    avgMinutes,
    avgQuality,
    bedtimeSpread,
    avgBedtime,
    avgWake: mean(wakes),
    debtMinutes,
    shortNights,
    consistency: consistencyLabel(bedtimeSpread, entries.length),
    tips: [],
  };
  insights.tips = buildTips(entries, insights, goal);
  return insights;
}

function buildTips(entries: SleepEntry[], s: SleepInsights, goal: number): SleepTip[] {
  if (s.nights < 3) {
    const left = 3 - s.nights;
    return [
      {
        id: "more-data",
        tone: "info",
        text: `Log ${left} more ${left === 1 ? "night" : "nights"} to see your patterns. A quick entry each morning is enough.`,
      },
    ];
  }

  const tips: SleepTip[] = [];

  if (s.avgMinutes < goal - 20) {
    tips.push({
      id: "short",
      tone: "warn",
      text: `You are averaging ${formatDuration(s.avgMinutes)} a night, ${formatDuration(goal - s.avgMinutes)} short of your ${formatDuration(goal)} goal. Move bedtime 15 minutes earlier this week, then another 15 next week.`,
    });
  }

  if (s.bedtimeSpread >= 45) {
    tips.push({
      id: "irregular",
      tone: "warn",
      text: `Your bedtime varies by about ${formatDuration(s.bedtimeSpread)} from night to night. Going to bed within the same half hour, weekends included, helps you fall asleep faster.`,
    });
  }

  // Weekend shift: Friday and Saturday nights against Sunday to Thursday.
  const weekend = entries.filter((e) => [5, 6].includes(dayOfWeek(e.night)));
  const weeknight = entries.filter((e) => ![5, 6].includes(dayOfWeek(e.night)));
  if (weekend.length >= 1 && weeknight.length >= 2) {
    const shift = mean(weekend.map((e) => bedtimeAxis(e.bedtime))) - mean(weeknight.map((e) => bedtimeAxis(e.bedtime)));
    if (shift >= 60) {
      tips.push({
        id: "weekend",
        tone: "info",
        text: `On Friday and Saturday nights you go to bed ${formatDuration(shift)} later than on weeknights. Keeping weekends within an hour of weekdays avoids the Monday slump.`,
      });
    }
  }

  // The strongest tag that goes with worse sleep, and any that goes with better.
  const effects = tagEffects(entries);
  const harmful = effects
    .filter((e) => e.qualityDiff <= -0.5 || e.durationDiff <= -30)
    .sort((a, b) => a.qualityDiff * 60 + a.durationDiff - (b.qualityDiff * 60 + b.durationDiff));
  for (const e of harmful.slice(0, 2)) {
    const label = TAG_LABELS[e.tag].toLowerCase();
    const parts: string[] = [];
    if (e.durationDiff <= -30) parts.push(`you sleep ${formatDuration(e.durationDiff)} less`);
    if (e.qualityDiff <= -0.5) parts.push(`quality drops by ${Math.abs(e.qualityDiff).toFixed(1)} points`);
    tips.push({
      id: `tag-${e.tag}`,
      tone: "warn",
      text: `On nights marked "${label}", ${parts.join(" and ")}. ${TAG_ADVICE[e.tag]}`,
    });
  }
  const helpful = effects.find((e) => e.tag === "workout" && (e.qualityDiff >= 0.5 || e.durationDiff >= 30));
  if (helpful) {
    tips.push({
      id: "tag-workout-good",
      tone: "good",
      text: "You sleep better on days you work out. Keep it up, ideally finishing 3 hours before bed.",
    });
  }

  if (s.avgBedtime > DAY_MIN + 30) {
    tips.push({
      id: "late",
      tone: "info",
      text: `Your usual bedtime is ${formatClock(s.avgBedtime)}, after midnight. If you wake early for work, an earlier bedtime is the only way to reach your goal.`,
    });
  }

  if (s.avgQuality > 0 && s.avgQuality <= 2.5 && !tips.some((t) => t.id.startsWith("tag-"))) {
    tips.push({
      id: "low-quality",
      tone: "warn",
      text: "Your sleep quality has been low. A cool, dark, quiet room and no heavy meal in the last 2 hours usually help. If it lasts for weeks, talk to a doctor.",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "steady",
      tone: "good",
      text: `Steady and on target: ${formatDuration(s.avgMinutes)} a night with a regular bedtime. Keep the same routine.`,
    });
  }

  return tips.slice(0, 4);
}

/* ---------------- entries ---------------- */

/** Adds or replaces an entry; one entry per night. Newest night first. */
export function upsertEntry(entries: SleepEntry[], entry: SleepEntry): SleepEntry[] {
  const others = entries.filter((e) => e.id !== entry.id && e.night !== entry.night);
  return [...others, entry].sort((a, b) => (a.night < b.night ? 1 : a.night > b.night ? -1 : 0));
}
