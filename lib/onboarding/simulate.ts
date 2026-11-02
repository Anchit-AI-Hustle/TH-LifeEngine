// Pure helpers for "Set up my first week": turn a person's profile into a
// believable two weeks of habit ticks, sleep and activity, so every screen
// has real-looking data on day one. No browser or network access here.
//
// The history is deterministic per seed (the profile id), so running the
// set-up twice gives the same picture rather than a different random one.

export type ProfileBrief = {
  id: string;
  name: string;
  age: number;
  gender: string; // "male" | "female" | "other" (free text tolerated)
  goals: string[];
  healthConcerns?: string;
  experience?: string; // beginner | intermediate | advanced
  preferredTime?: string; // morning | evening | flexible ...
};

/* ------------------------------------------------------------------ rng */

/** Small, fast, seedable PRNG (mulberry32). */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- dates */

/** YYYY-MM-DD in local time, `daysAgo` days before `from`. */
export function dateKey(daysAgo: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - daysAgo);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Minutes after midnight (may exceed 1440 or be negative) to "HH:MM". */
export function clock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/* ---------------------------------------------------------- goal mapping */

type Theme = "weight" | "pcos" | "sugar" | "stress" | "sleep" | "strength" | "joints" | "general";

/** What a profile is mostly about, read from its goals and health notes. */
export function themesFor(p: ProfileBrief): Theme[] {
  const text = `${p.goals.join(" ")} ${p.healthConcerns ?? ""}`.toLowerCase();
  const t = new Set<Theme>();
  if (/weight|fat|lean|obes|belly/.test(text)) t.add("weight");
  if (/pcos|pcod|hormon|thyroid/.test(text)) t.add("pcos");
  if (/sugar|diabet|glucose|insulin/.test(text)) t.add("sugar");
  if (/stress|anxi|calm|mental|mind/.test(text)) t.add("stress");
  if (/sleep|insomnia|tired|fatigue|energy/.test(text)) t.add("sleep");
  if (/muscle|strength|tone|gain/.test(text)) t.add("strength");
  if (/knee|back|joint|arthrit|pain|neck|posture/.test(text)) t.add("joints");
  if (t.size === 0) t.add("general");
  return [...t];
}

/** Habit template ids (lib/habits/templates.ts) that fit the profile, best first. */
export function habitTemplatesFor(p: ProfileBrief): string[] {
  const th = themesFor(p);
  const picks: string[] = ["water"];
  if (th.includes("weight") || th.includes("sugar") || th.includes("pcos")) picks.push("walk-after-meals", "no-sugar");
  if (th.includes("stress") || th.includes("pcos")) picks.push("pranayama");
  if (th.includes("sleep") || th.includes("stress")) picks.push("sleep-by-11");
  if (th.includes("strength")) picks.push("strength");
  if (th.includes("joints")) picks.push("stretch-breaks");
  if (th.includes("general")) picks.push("walk-after-meals", "pranayama", "sleep-by-11");
  return [...new Set(picks)].slice(0, 4);
}

/** Plan types for the wellness plan generator (lib/lifeengine/planConfig.ts values). */
export function planTypesFor(p: ProfileBrief): string[] {
  const th = themesFor(p);
  const types = ["yoga"];
  if (th.includes("weight")) types.push("weight_loss");
  if (th.includes("pcos")) types.push("hormone");
  if (th.includes("sugar")) types.push("metabolic");
  if (th.includes("stress")) types.push("stress_management");
  if (th.includes("strength")) types.push("fitness");
  types.push("diet");
  return [...new Set(types)].slice(0, 3);
}

/** Fitness goal ids (lib/fitness/types.ts GoalId) for the activity planner. */
export function fitnessGoalsFor(p: ProfileBrief): string[] {
  const th = themesFor(p);
  const g: string[] = [];
  if (th.includes("weight")) g.push("weight_loss");
  if (th.includes("pcos")) g.push("pcos_hormonal");
  if (th.includes("sugar")) g.push("blood_sugar");
  if (th.includes("stress")) g.push("stress_calm");
  if (th.includes("sleep")) g.push("sleep_quality");
  if (th.includes("strength")) g.push("muscle_gain");
  if (th.includes("joints")) g.push("joint_pain");
  if (g.length === 0) g.push("stamina", "flexibility");
  return g.slice(0, 3);
}

/* -------------------------------------------------------- habit history */

/**
 * Days (date keys) on which a habit was done over the last `days` days.
 * Adherence starts around `start` and improves a little each week, with
 * realistic misses (weekends slip more), and today left open to tick.
 */
export function habitDoneDays(seed: string, days = 14, start = 0.68, now = new Date()): string[] {
  const r = rng(seed);
  const out: string[] = [];
  for (let ago = days - 1; ago >= 1; ago--) {
    const progress = (days - ago) / days; // later days are a bit better
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const p = Math.min(0.95, start + progress * 0.18 - (weekend ? 0.15 : 0));
    if (r() < p) out.push(dateKey(ago, now));
  }
  return out;
}

/* --------------------------------------------------------- sleep nights */

export type SimNight = {
  night: string;
  bedtime: string;
  wake: string;
  quality: 1 | 2 | 3 | 4 | 5;
  tags: ("caffeine" | "screens" | "workout" | "stress" | "late-meal" | "alcohol" | "nap")[];
  notes: string;
};

/**
 * `days` nights ending last night. Weeknights near 11pm, weekends later;
 * screens and stress push bedtime back and quality down, workouts help.
 */
export function sleepNights(seed: string, days = 14, now = new Date()): SimNight[] {
  const r = rng(`${seed}:sleep`);
  const nights: SimNight[] = [];
  for (let ago = days; ago >= 1; ago--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago);
    const weekend = d.getDay() === 5 || d.getDay() === 6; // Fri/Sat nights
    const tags: SimNight["tags"] = [];
    if (r() < 0.35) tags.push("screens");
    if (r() < 0.2) tags.push("stress");
    if (r() < 0.3) tags.push("workout");
    if (r() < 0.15) tags.push("late-meal");
    if (r() < 0.12) tags.push("caffeine");
    let bed = 23 * 60 + (weekend ? 50 : 0) + Math.round((r() - 0.5) * 50);
    if (tags.includes("screens")) bed += 25;
    if (tags.includes("stress")) bed += 15;
    let sleepFor = 7 * 60 + Math.round((r() - 0.45) * 80) + (weekend ? 35 : 0);
    if (tags.includes("caffeine") || tags.includes("stress")) sleepFor -= 30;
    if (tags.includes("workout")) sleepFor += 15;
    sleepFor = Math.max(5 * 60, Math.min(9 * 60, sleepFor));
    let q = 3 + (sleepFor >= 7 * 60 ? 1 : 0) + (tags.includes("workout") ? 1 : 0) - (tags.includes("stress") || tags.includes("caffeine") ? 1 : 0) - (tags.includes("screens") && r() < 0.5 ? 1 : 0);
    q = Math.max(1, Math.min(5, q));
    nights.push({
      night: dateKey(ago, now),
      bedtime: clock(bed),
      wake: clock(bed + sleepFor),
      quality: q as SimNight["quality"],
      tags,
      notes: "",
    });
  }
  return nights;
}

/* --------------------------------------------------------- daily checks */

export type SimDay = {
  date: string;
  adherence: "completed" | "partial" | "missed" | "rest";
  minutesFactor: number; // share of the planned minutes actually done
  steps: number;
  mood: number; // 1-5
  energy: number; // 1-5
  stress: number; // 1-5
  sleepHours: number;
  waterMl: number;
  weightKg?: number;
};

/** A week of tracker check-ins: mostly done, one rest day, one partial, a slow weight trend. */
export function trackerDays(seed: string, weightKg: number, days = 7, now = new Date(), losing = true): SimDay[] {
  const r = rng(`${seed}:tracker`);
  const out: SimDay[] = [];
  for (let ago = days; ago >= 1; ago--) {
    const i = days - ago;
    const roll = r();
    const adherence: SimDay["adherence"] = i === 3 ? "rest" : roll < 0.12 ? "missed" : roll < 0.3 ? "partial" : "completed";
    out.push({
      date: dateKey(ago, now),
      adherence,
      minutesFactor: adherence === "completed" ? 1 : adherence === "partial" ? 0.5 : 0,
      steps: Math.round(5200 + r() * 4200 + (adherence === "completed" ? 1500 : 0)),
      mood: Math.round(3 + r() * 2),
      energy: Math.round(3 + r() * 1.8),
      stress: Math.round(2 + r() * 2),
      sleepHours: Math.round((6.4 + r() * 1.5) * 10) / 10,
      waterMl: Math.round((1800 + r() * 1100) / 100) * 100,
      weightKg: i % 2 === 0 ? Math.round((weightKg + (losing ? -0.08 : 0.04) * i + (r() - 0.5) * 0.4) * 10) / 10 : undefined,
    });
  }
  return out;
}
