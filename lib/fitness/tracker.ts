/**
 * Tracker analytics.
 *
 * Turns a list of daily logs into streaks, weekly rollups, trends, goal
 * progress and rule-based insights. Pure functions — the same logs always
 * produce the same summary, and nothing here touches storage.
 */

import { getActivity } from "./activities";
import { GOALS } from "./goals";
import type {
  ActivityCategory,
  DailyLog,
  FitnessPlan,
  FitnessProfile,
  ModalityBucket,
  StreakInfo,
  TrackedMetric,
  TrackerInsight,
  TrackerSummary,
  TrendPoint,
  WeeklyRollup,
} from "./types";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDaysAgo(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Monday-start week containing the given ISO date. */
export function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function activeMinutes(log: DailyLog): number {
  return log.activities.reduce((sum, a) => sum + a.minutes, 0);
}

function isActiveDay(log: DailyLog): boolean {
  return activeMinutes(log) >= 10 || log.adherence === "completed" || log.adherence === "partial" || log.adherence === "swapped";
}

export function computeStreak(logs: DailyLog[]): StreakInfo {
  const activeDates = new Set(logs.filter(isActiveDay).map((l) => l.date));
  const sorted = [...activeDates].sort();

  let longest = 0;
  let running = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    if (previous && new Date(date).getTime() - new Date(previous).getTime() === 86_400_000) {
      running += 1;
    } else {
      running = 1;
    }
    longest = Math.max(longest, running);
    previous = date;
  }

  // Current streak counts back from today, tolerating "not logged yet today".
  let current = 0;
  let cursor = 0;
  if (!activeDates.has(todayIso())) cursor = 1;
  while (activeDates.has(isoDaysAgo(cursor))) {
    current += 1;
    cursor += 1;
  }

  const last7 = new Set<string>();
  const last30 = new Set<string>();
  for (let i = 0; i < 30; i += 1) {
    const date = isoDaysAgo(i);
    if (activeDates.has(date)) {
      last30.add(date);
      if (i < 7) last7.add(date);
    }
  }

  return {
    current,
    longest: Math.max(longest, current),
    lastActiveDate: sorted[sorted.length - 1],
    activeDaysLast7: last7.size,
    activeDaysLast30: last30.size,
  };
}

function average(values: number[]): number | null {
  const clean = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!clean.length) return null;
  return Number((clean.reduce((s, v) => s + v, 0) / clean.length).toFixed(1));
}

export function rollupWeek(logs: DailyLog[], startIso: string, targetMinutes: number): WeeklyRollup {
  const inWeek = logs.filter((l) => weekStart(l.date) === startIso);

  const byCategory = new Map<ActivityCategory, number>();
  const byBucket = new Map<ModalityBucket, number>();
  let indoor = 0;
  let outdoor = 0;
  let calories = 0;
  let minutes = 0;
  let sessions = 0;
  const rpes: number[] = [];

  for (const log of inWeek) {
    for (const activity of log.activities) {
      minutes += activity.minutes;
      calories += activity.caloriesEst;
      byCategory.set(activity.category, (byCategory.get(activity.category) ?? 0) + activity.minutes);
      if (activity.environment === "indoor") indoor += activity.minutes;
      else outdoor += activity.minutes;
      const def = getActivity(activity.activityId);
      for (const bucket of def?.buckets ?? []) {
        byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + activity.minutes);
      }
      if (activity.rpe) rpes.push(activity.rpe);
    }
    if (log.activities.length) sessions += 1;
  }

  const plannedDays = inWeek.filter((l) => l.adherence !== "rest");
  const kept = plannedDays.filter((l) => l.adherence === "completed" || l.adherence === "swapped").length;
  const partial = plannedDays.filter((l) => l.adherence === "partial").length;

  return {
    weekStart: startIso,
    activeMinutes: minutes,
    targetMinutes,
    sessions,
    caloriesBurned: calories,
    steps: inWeek.reduce((s, l) => s + (l.steps ?? 0), 0),
    avgRpe: average(rpes),
    avgPain: average(inWeek.map((l) => l.painScore).filter((v): v is number => v !== undefined)),
    avgSleep: average(inWeek.map((l) => l.sleepHours).filter((v): v is number => v !== undefined)),
    avgMood: average(inWeek.map((l) => l.mood).filter((v): v is number => v !== undefined)),
    avgStress: average(inWeek.map((l) => l.stress).filter((v): v is number => v !== undefined)),
    adherencePct: plannedDays.length ? Math.round(((kept + partial * 0.5) / plannedDays.length) * 100) : 0,
    byCategory: [...byCategory.entries()].map(([category, mins]) => ({ category, minutes: mins })).sort((a, b) => b.minutes - a.minutes),
    byEnvironment: { indoor, outdoor },
    byBucket: [...byBucket.entries()].map(([bucket, mins]) => ({ bucket, minutes: mins })).sort((a, b) => b.minutes - a.minutes),
  };
}

function trend(logs: DailyLog[], pick: (log: DailyLog) => number | undefined, days = 60): TrendPoint[] {
  const cutoff = isoDaysAgo(days);
  return logs
    .filter((l) => l.date >= cutoff)
    .map((l) => ({ date: l.date, value: pick(l) }))
    .filter((p): p is TrendPoint => p.value !== undefined && p.value !== null && !Number.isNaN(p.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Slope sign over the series, using first-third vs last-third averages. */
function direction(points: TrendPoint[]): { change: number; label: "up" | "down" | "flat" } {
  if (points.length < 4) return { change: 0, label: "flat" };
  const third = Math.max(1, Math.floor(points.length / 3));
  const first = points.slice(0, third).reduce((s, p) => s + p.value, 0) / third;
  const last = points.slice(-third).reduce((s, p) => s + p.value, 0) / third;
  const change = Number((last - first).toFixed(2));
  return { change, label: Math.abs(change) < 0.15 ? "flat" : change > 0 ? "up" : "down" };
}

/* ------------------------------------------------------------------ *
 * Insights
 * ------------------------------------------------------------------ */

function buildInsights(
  profile: FitnessProfile,
  plan: FitnessPlan | undefined,
  logs: DailyLog[],
  streak: StreakInfo,
  thisWeek: WeeklyRollup,
  lastWeek: WeeklyRollup | null,
  trends: TrackerSummary["trends"],
): TrackerInsight[] {
  const insights: TrackerInsight[] = [];
  const goal = GOALS[profile.primaryGoal];

  /* --- adherence & volume --- */
  if (streak.current >= 7) {
    insights.push({
      level: "good",
      title: `${streak.current}-day streak`,
      detail: "This is the part that actually changes outcomes. Consistency compounds — protect the streak over any single session's quality.",
    });
  } else if (streak.current === 0 && logs.length) {
    insights.push({
      level: "warn",
      title: "Streak broken",
      detail: "Missing one day is normal. Missing two starts a new pattern.",
      action: `Do your minimum version today — even ${Math.max(5, Math.round(profile.minutesPerSession * 0.25))} minutes resets the streak.`,
    });
  }

  if (thisWeek.activeMinutes && thisWeek.targetMinutes) {
    const pct = Math.round((thisWeek.activeMinutes / thisWeek.targetMinutes) * 100);
    if (pct >= 100) {
      insights.push({ level: "good", title: `Weekly target hit (${pct}%)`, detail: `${thisWeek.activeMinutes} of ${thisWeek.targetMinutes} target minutes. You are in the volume band where the health benefits are well established.` });
    } else if (pct >= 60) {
      insights.push({ level: "info", title: `${pct}% of your weekly target`, detail: `${thisWeek.targetMinutes - thisWeek.activeMinutes} minutes to go.`, action: "Two brisk walks would close the gap." });
    } else {
      insights.push({ level: "warn", title: `Only ${pct}% of your weekly target`, detail: "Volume, not intensity, is what drives most of the benefit at this stage.", action: "Add a 20-minute walk on your two easiest days." });
    }
  }

  if (lastWeek && lastWeek.activeMinutes > 0) {
    const jump = (thisWeek.activeMinutes - lastWeek.activeMinutes) / lastWeek.activeMinutes;
    if (jump > 0.3) {
      insights.push({
        level: "risk",
        title: `Volume jumped ${Math.round(jump * 100)}% in a week`,
        detail: "Increases above about 10% a week are the most common cause of overuse injury.",
        action: "Hold this week's volume steady rather than adding more.",
      });
    }
  }

  /* --- pain --- */
  const painTrend = direction(trends.pain);
  if (trends.pain.length >= 4) {
    if (painTrend.label === "down") {
      insights.push({ level: "good", title: "Pain trending down", detail: `Average pain has fallen by about ${Math.abs(painTrend.change)} points across your logged period. What you are doing is working — keep the dose the same rather than jumping ahead.` });
    } else if (painTrend.label === "up") {
      insights.push({
        level: "risk",
        title: "Pain trending up",
        detail: `Average pain has risen by about ${painTrend.change} points. That usually means the load is climbing faster than your tissue tolerance.`,
        action: "Repeat last week's volume instead of progressing, and switch high-impact sessions for water or bike work.",
      });
    }
  }
  const recentHighPain = logs.filter((l) => l.date >= isoDaysAgo(7) && (l.painScore ?? 0) >= 7);
  if (recentHighPain.length >= 2) {
    insights.push({
      level: "risk",
      title: "Several high-pain days this week",
      detail: "Pain at 7/10 or above on multiple days is a signal, not something to train through.",
      action: "Drop to gentle range-of-motion work and get it assessed if it does not settle within a week.",
    });
  }

  /* --- sleep, mood, stress --- */
  const sleepAvg = thisWeek.avgSleep;
  if (sleepAvg !== null && sleepAvg < 6.5) {
    insights.push({
      level: "warn",
      title: `Averaging ${sleepAvg} hours of sleep`,
      detail: "Short sleep raises hunger hormones, blunts muscle adaptation and makes every session feel harder. It limits results more than any programming detail.",
      action: "Move your wake time earlier and keep it fixed, including weekends.",
    });
  }
  const moodTrend = direction(trends.mood);
  if (moodTrend.label === "up" && trends.mood.length >= 5) {
    insights.push({ level: "good", title: "Mood improving", detail: "Mood ratings are trending up alongside your activity — one of the most reliable effects of regular movement." });
  }
  if (thisWeek.avgStress !== null && thisWeek.avgStress >= 7) {
    insights.push({
      level: "info",
      title: "Stress is running high",
      detail: "High stress raises cortisol, disturbs sleep and reduces recovery from training.",
      action: "Swap one harder session this week for breathwork or a gentle walk outdoors — that is not backing off, it is correct programming.",
    });
  }

  /* --- weight & waist --- */
  const weightTrend = direction(trends.weight);
  if (trends.weight.length >= 5) {
    const wantsLoss = ["weight_loss", "belly_fat", "blood_sugar", "fatty_liver", "sleep_apnoea"].includes(profile.primaryGoal);
    const wantsGain = ["weight_gain", "muscle_gain"].includes(profile.primaryGoal);
    if (wantsLoss && weightTrend.label === "down") {
      insights.push({ level: "good", title: "Weight trending down", detail: `Down about ${Math.abs(weightTrend.change)} kg across your logs. The healthy range is 0.4-0.8 kg a week — faster than that costs muscle.` });
    } else if (wantsLoss && weightTrend.label === "flat" && thisWeek.adherencePct > 70) {
      insights.push({
        level: "info",
        title: "Weight flat despite good adherence",
        detail: "Plateaus at 6-10 weeks are normal, and body composition often keeps improving while the scale does not.",
        action: "Check your waist measurement and take progress photos before changing anything about the plan.",
      });
    } else if (wantsGain && weightTrend.label !== "up") {
      insights.push({ level: "info", title: "Weight not increasing", detail: "For weight or muscle gain, the calorie surplus is the limiting factor, not the training.", action: "Add 300 kcal a day and re-check in two weeks." });
    }
  }

  /* --- balance of stimuli --- */
  if (thisWeek.activeMinutes > 60) {
    const strengthMinutes = thisWeek.byBucket.find((b) => b.bucket === "strength")?.minutes ?? 0;
    if (strengthMinutes === 0 && (goal?.bucketWeights.strength ?? 0) >= 5) {
      insights.push({
        level: "warn",
        title: "No strength work logged this week",
        detail: `Strength training is central to ${goal?.label.toLowerCase() ?? "your goal"} — it protects muscle, bone and metabolic rate.`,
        action: "Get one full-body session in before the week ends, even a 20-minute band circuit.",
      });
    }
    const calmMinutes = thisWeek.byBucket.find((b) => b.bucket === "mindbody_calm")?.minutes ?? 0;
    if (calmMinutes === 0 && (goal?.bucketWeights.mindbody_calm ?? 0) >= 5) {
      insights.push({ level: "info", title: "No calm work logged", detail: "Your goal depends as much on lowering nervous-system load as on training it.", action: "Five minutes of slow breathing today counts." });
    }
    if (thisWeek.byEnvironment.outdoor === 0 && profile.environmentPreference !== "indoor") {
      insights.push({ level: "info", title: "All sessions were indoors", detail: "Outdoor activity adds daylight exposure, which helps sleep timing and mood beyond the exercise itself.", action: "Move one walk outside this week." });
    }
  }

  /* --- steps --- */
  const stepAvg = average(trends.steps.slice(-7).map((p) => p.value));
  if (stepAvg !== null && plan) {
    const target = plan.metrics.stepTarget;
    if (stepAvg >= target) {
      insights.push({ level: "good", title: `Averaging ${Math.round(stepAvg).toLocaleString()} steps`, detail: `At or above your ${target.toLocaleString()} target. Daily step count correlates more strongly with health outcomes than any single workout.` });
    } else if (stepAvg < target * 0.6) {
      insights.push({ level: "warn", title: `Averaging ${Math.round(stepAvg).toLocaleString()} steps of ${target.toLocaleString()}`, detail: "Low daily movement outside sessions undoes much of the benefit of the sessions themselves.", action: "Add a 10-minute walk after each main meal — it also blunts post-meal glucose spikes." });
    }
  }

  /* --- RPE / overreaching --- */
  if (thisWeek.avgRpe !== null && thisWeek.avgRpe >= 8) {
    insights.push({
      level: "warn",
      title: "Every session is going hard",
      detail: `Average RPE of ${thisWeek.avgRpe} means you have no easy days. Roughly 80% of training should feel easy — that is what makes the hard 20% possible.`,
      action: "Make your next two sessions genuinely conversational.",
    });
  }

  /* --- symptoms --- */
  const symptomLogs = logs.filter((l) => l.date >= isoDaysAgo(14) && l.symptoms?.length);
  if (symptomLogs.length >= 3) {
    insights.push({
      level: "warn",
      title: "Symptoms logged repeatedly",
      detail: `You have recorded symptoms on ${symptomLogs.length} days in the last two weeks.`,
      action: "Take your log to your clinician — the pattern is more useful to them than any single day.",
    });
  }

  if (!logs.length) {
    insights.push({
      level: "info",
      title: "Start logging",
      detail: "The tracker becomes useful after about a week of data: streaks, trends and the pain and volume warnings all need history to work from.",
      action: "Log today's session, your steps and how you slept — 30 seconds is enough.",
    });
  }

  return insights;
}

/* ------------------------------------------------------------------ *
 * Summary
 * ------------------------------------------------------------------ */

const METRIC_META: Partial<Record<TrackedMetric, { label: string; unit: string; direction: "up" | "down" }>> = {
  weight: { label: "Weight", unit: "kg", direction: "down" },
  waist: { label: "Waist", unit: "cm", direction: "down" },
  steps: { label: "Daily steps", unit: "steps", direction: "up" },
  active_minutes: { label: "Weekly active minutes", unit: "min", direction: "up" },
  pain_score: { label: "Pain", unit: "/10", direction: "down" },
  sleep_hours: { label: "Sleep", unit: "hrs", direction: "up" },
  mood: { label: "Mood", unit: "/10", direction: "up" },
  stress: { label: "Stress", unit: "/10", direction: "down" },
  energy: { label: "Energy", unit: "/10", direction: "up" },
  resting_hr: { label: "Resting heart rate", unit: "bpm", direction: "down" },
  blood_glucose: { label: "Blood glucose", unit: "mg/dL", direction: "down" },
  adherence: { label: "Adherence", unit: "%", direction: "up" },
  calories_burned: { label: "Calories burned", unit: "kcal", direction: "up" },
  rpe: { label: "Session effort", unit: "RPE", direction: "up" },
};

export function summariseTracker(
  profile: FitnessProfile,
  logs: DailyLog[],
  plan?: FitnessPlan,
): TrackerSummary {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const targetMinutes = plan?.weeks[0]?.targetWeeklyMinutes ?? plan?.metrics.weeklyMinutesTarget ?? 150;

  const thisWeekStart = weekStart(todayIso());
  const lastWeekStart = weekStart(isoDaysAgo(7));

  const thisWeek = rollupWeek(sorted, thisWeekStart, targetMinutes);
  const lastWeekRaw = rollupWeek(sorted, lastWeekStart, targetMinutes);
  const lastWeek = sorted.some((l) => weekStart(l.date) === lastWeekStart) ? lastWeekRaw : null;

  const trends: TrackerSummary["trends"] = {
    weight: trend(sorted, (l) => l.weightKg),
    pain: trend(sorted, (l) => l.painScore),
    sleep: trend(sorted, (l) => l.sleepHours),
    mood: trend(sorted, (l) => l.mood),
    activeMinutes: trend(sorted, (l) => (l.activities.length ? activeMinutes(l) : undefined)),
    steps: trend(sorted, (l) => l.steps),
    rpe: trend(sorted, (l) => average(l.activities.map((a) => a.rpe).filter((v): v is number => v !== undefined)) ?? undefined),
  };

  const streak = computeStreak(sorted);

  const totals = {
    sessions: sorted.filter((l) => l.activities.length).length,
    minutes: sorted.reduce((s, l) => s + activeMinutes(l), 0),
    calories: sorted.reduce((s, l) => s + l.activities.reduce((x, a) => x + a.caloriesEst, 0), 0),
    days: sorted.length,
  };

  const tracked = plan?.trackedMetrics ?? GOALS[profile.primaryGoal]?.keyMetrics ?? ["active_minutes", "adherence"];
  const goalProgress = tracked
    .map((metric) => {
      const meta = METRIC_META[metric];
      if (!meta) return null;
      const current = (() => {
        switch (metric) {
          case "weight":
            return trends.weight.at(-1)?.value ?? profile.weightKg;
          case "waist":
            return profile.waistCm ?? null;
          case "steps":
            return average(trends.steps.slice(-7).map((p) => p.value));
          case "active_minutes":
            return thisWeek.activeMinutes;
          case "pain_score":
            return average(trends.pain.slice(-7).map((p) => p.value));
          case "sleep_hours":
            return average(trends.sleep.slice(-7).map((p) => p.value));
          case "mood":
            return average(trends.mood.slice(-7).map((p) => p.value));
          case "stress":
            return thisWeek.avgStress;
          case "resting_hr":
            return average(sorted.slice(-7).map((l) => l.restingHr).filter((v): v is number => v !== undefined));
          case "adherence":
            return thisWeek.adherencePct;
          case "calories_burned":
            return thisWeek.caloriesBurned;
          case "rpe":
            return thisWeek.avgRpe;
          default:
            return null;
        }
      })();
      const target = (() => {
        switch (metric) {
          case "weight":
            return profile.targetWeightKg ?? null;
          case "steps":
            return plan?.metrics.stepTarget ?? 8000;
          case "active_minutes":
            return targetMinutes;
          case "adherence":
            return 80;
          case "sleep_hours":
            return 7.5;
          case "pain_score":
            return 2;
          case "waist":
            return profile.waistCm ? Math.round(profile.heightCm * 0.48) : null;
          default:
            return null;
        }
      })();
      return { metric, label: meta.label, current, target, unit: meta.unit, direction: meta.direction };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    streak,
    thisWeek,
    lastWeek,
    trends,
    totals,
    insights: buildInsights(profile, plan, sorted, streak, thisWeek, lastWeek, trends),
    goalProgress,
  };
}

/** Turns a plan day into pre-filled log rows so ticking off is one tap. */
export function logTemplateFromPlan(plan: FitnessPlan, weekIndex: number, dayIndex: number): DailyLog["activities"] {
  const week = plan.weeks.find((w) => w.weekIndex === weekIndex) ?? plan.weeks[0];
  const day = week?.days.find((d) => d.dayIndex === dayIndex);
  if (!day) return [];
  return day.blocks.map((block) => ({
    activityId: block.activityId,
    name: block.name,
    category: block.category,
    environment: block.environment,
    minutes: block.minutes,
    caloriesEst: block.estimatedCalories,
    planned: true,
  }));
}
