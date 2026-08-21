/**
 * The planner.
 *
 * Deterministic pipeline: screen -> merge goals -> derive metrics ->
 * filter the activity catalog against every safety constraint -> score what
 * survives -> allocate a weekly split -> build each day's blocks -> apply
 * 4-week progression. No model call, so the same profile always produces the
 * same plan and the plan works offline.
 */

import { ACTIVITIES, CATEGORY_LABELS, getActivity } from "./activities";
import { CONDITIONS } from "./conditions";
import { GOALS } from "./goals";
import { buildSafetyReport, impactRank, intensityRank, jointRank } from "./screening";
import { deriveMetrics, estimateCalories, heartRateZones, rpeWindow } from "./metrics";
import type {
  ActivityDefinition,
  DailyPlan,
  Environment,
  FitnessPlan,
  FitnessProfile,
  GoalDefinition,
  GoalId,
  Intensity,
  ModalityBucket,
  PlanBlock,
  PlanWeek,
  SafetyReport,
  TrackedMetric,
} from "./types";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const BUCKET_FOCUS: Record<ModalityBucket, string> = {
  cardio_steady: "Steady cardio",
  cardio_interval: "Intervals & conditioning",
  strength: "Strength",
  mobility_flexibility: "Mobility & flexibility",
  mindbody_calm: "Mind-body & calm",
  sport_play: "Sport & play",
  rehab_corrective: "Targeted rehab",
  active_recovery: "Active recovery",
  balance_coordination: "Balance & coordination",
};

/* ------------------------------------------------------------------ *
 * Goal merging
 * ------------------------------------------------------------------ */

export interface MergedGoal {
  primary: GoalDefinition;
  all: GoalDefinition[];
  bucketWeights: Record<ModalityBucket, number>;
  avoidTags: Set<string>;
  intensityCap: Intensity;
  sessionMinutes: { min: number; target: number; max: number };
  weeklyMinutesTarget: number;
  progressionRate: number;
  keyMetrics: TrackedMetric[];
  nonNegotiables: string[];
  cautions: string[];
}

/**
 * Combines the selected goals into one prescription. The primary goal is
 * weighted double so it drives the split, but every selected goal contributes,
 * and the strictest intensity cap and shortest session window always win.
 */
export function mergeGoals(profile: FitnessProfile): MergedGoal {
  const ids: GoalId[] = [profile.primaryGoal, ...profile.goals.filter((g) => g !== profile.primaryGoal)];
  const defs = ids.map((id) => GOALS[id]).filter(Boolean);
  const primary = GOALS[profile.primaryGoal] ?? defs[0] ?? GOALS.maintain_weight;

  const weights = {} as Record<ModalityBucket, number>;
  const avoidTags = new Set<string>();
  const keyMetrics = new Set<TrackedMetric>();
  const nonNegotiables = new Set<string>();
  const cautions = new Set<string>();

  let intensityCap: Intensity = "maximal";
  let minSession = 0;
  let targetSession = 0;
  let maxSession = 999;
  let weeklyMinutes = 0;
  let progressionRate = 1;

  defs.forEach((goal, index) => {
    const multiplier = index === 0 ? 2 : 1;
    for (const [bucket, weight] of Object.entries(goal.bucketWeights)) {
      const key = bucket as ModalityBucket;
      weights[key] = (weights[key] ?? 0) + (weight ?? 0) * multiplier;
    }
    goal.avoidTags.forEach((t) => avoidTags.add(t));
    goal.keyMetrics.forEach((m) => keyMetrics.add(m));
    goal.nonNegotiables.forEach((n) => nonNegotiables.add(n));
    goal.cautions.forEach((c) => cautions.add(c));
    if (intensityRank(goal.intensityCap) < intensityRank(intensityCap)) intensityCap = goal.intensityCap;
    minSession = Math.max(minSession, goal.sessionMinutes.min);
    targetSession += goal.sessionMinutes.target * multiplier;
    maxSession = Math.min(maxSession, goal.sessionMinutes.max);
    weeklyMinutes = Math.max(weeklyMinutes, goal.weeklyMinutesTarget);
    progressionRate = Math.min(progressionRate, goal.progressionRate);
  });

  const weightDenominator = defs.reduce((sum, _, i) => sum + (i === 0 ? 2 : 1), 0) || 1;
  const target = Math.round(targetSession / weightDenominator);

  return {
    primary,
    all: defs,
    bucketWeights: weights,
    avoidTags,
    intensityCap,
    sessionMinutes: {
      min: Math.min(minSession, maxSession),
      target: Math.min(Math.max(target, Math.min(minSession, maxSession)), maxSession),
      max: maxSession,
    },
    weeklyMinutesTarget: weeklyMinutes,
    progressionRate,
    keyMetrics: [...keyMetrics],
    nonNegotiables: [...nonNegotiables],
    cautions: [...cautions],
  };
}

/* ------------------------------------------------------------------ *
 * Activity filtering & scoring
 * ------------------------------------------------------------------ */

export interface ScoredActivity {
  activity: ActivityDefinition;
  score: number;
  reasons: string[];
}

function equipmentAvailable(activity: ActivityDefinition, profile: FitnessProfile): boolean {
  return activity.equipment.every(
    (item) => item === "none" || profile.availableEquipment.includes(item),
  );
}

function environmentAllowed(activity: ActivityDefinition, profile: FitnessProfile): boolean {
  if (profile.environmentPreference === "both") return true;
  return activity.environments.includes(profile.environmentPreference);
}

/**
 * Hard safety filter. An activity is out if it carries any excluded tag, or
 * exceeds the intensity / impact / joint-load ceiling the safety report set.
 */
export function isActivityEligible(
  activity: ActivityDefinition,
  profile: FitnessProfile,
  safety: SafetyReport,
  merged: MergedGoal,
): boolean {
  for (const tag of activity.tags) {
    if (safety.excludedTags.includes(tag)) return false;
    if (merged.avoidTags.has(tag)) return false;
  }
  if (intensityRank(activity.intensity) > intensityRank(safety.intensityCeiling)) return false;
  if (intensityRank(activity.intensity) > intensityRank(merged.intensityCap)) return false;
  if (impactRank(activity.impact) > impactRank(safety.maxImpact)) return false;
  if (jointRank(activity.jointLoad) > jointRank(safety.maxJointLoad)) return false;
  if (!equipmentAvailable(activity, profile)) return false;
  if (!environmentAllowed(activity, profile)) return false;
  if (profile.noiseConstraint && !activity.apartmentFriendly) return false;

  // Home space only constrains what is actually done at home. Venue-based
  // activities (pool, gym, court) are gated by the equipment check above, and
  // outdoor activities use outdoor space — neither is limited by room size.
  const doneAtHome =
    activity.spaceNeeded !== "venue" &&
    (!activity.environments.includes("outdoor") || profile.environmentPreference === "indoor");
  if (doneAtHome) {
    if (profile.spaceConstraint === "tiny_room" && (activity.spaceNeeded === "large" || activity.spaceNeeded === "medium")) return false;
    if (profile.spaceConstraint === "room" && activity.spaceNeeded === "large") return false;
  }
  if (profile.dislikedCategories.includes(activity.category)) return false;
  // Skill gating: a beginner is not handed advanced work.
  const skillOrder = { beginner: 0, intermediate: 1, advanced: 2 };
  if (skillOrder[activity.skill] > skillOrder[profile.experience] + 1) return false;
  if (skillOrder[activity.skill] > skillOrder[profile.experience] && profile.experience === "beginner") return false;
  return true;
}

export function scoreActivity(
  activity: ActivityDefinition,
  profile: FitnessProfile,
  merged: MergedGoal,
  safety: SafetyReport,
): ScoredActivity {
  let score = 0;
  const reasons: string[] = [];

  // Goal alignment is the dominant term.
  if (activity.goodFor.includes(profile.primaryGoal)) {
    score += 40;
    reasons.push(`Directly targets your main goal: ${merged.primary.label.toLowerCase()}`);
  }
  const otherGoalHits = profile.goals.filter((g) => g !== profile.primaryGoal && activity.goodFor.includes(g));
  score += otherGoalHits.length * 12;
  if (otherGoalHits.length) {
    reasons.push(`Also supports ${otherGoalHits.map((g) => GOALS[g]?.label.toLowerCase()).filter(Boolean).join(", ")}`);
  }

  // Bucket weight: does this stimulus matter for this person?
  const bucketScore = Math.max(...activity.buckets.map((b) => merged.bucketWeights[b] ?? 0), 0);
  score += bucketScore * 2.5;

  // Preference.
  if (profile.likedCategories.includes(activity.category)) {
    score += 18;
    reasons.push("You said you enjoy this kind of activity");
  }

  // Conditions that name this category as preferred.
  for (const conditionId of profile.conditions) {
    const preferred = CONDITIONS[conditionId];
    if (preferred?.preferredCategories.includes(activity.category)) {
      score += 8;
    }
  }

  // Caution tags are allowed but discouraged.
  const cautionHits = activity.tags.filter((t) => safety.cautionTags.includes(t));
  score -= cautionHits.length * 9;
  if (cautionHits.length) {
    reasons.push("Included with modifications because of your health profile");
  }

  // Joint-friendliness bonus when pain or arthritis is in play.
  const painful = profile.painPoints.some((p) => p.severity >= 4) || profile.conditions.some((c) => c.includes("arthritis") || c.includes("osteoarthritis"));
  if (painful) {
    if (activity.jointLoad === "minimal") score += 14;
    else if (activity.jointLoad === "low") score += 8;
    else if (activity.jointLoad === "high") score -= 10;
  }

  // Environment fit.
  if (profile.environmentPreference !== "both" && activity.environments.length === 1 && activity.environments[0] === profile.environmentPreference) {
    score += 6;
  }
  if (activity.weatherDependent && (profile.climate === "monsoon" || profile.climate === "polluted_city")) {
    score -= 6;
  }

  // Session length fit.
  if (activity.targetMinutes <= profile.minutesPerSession) score += 6;
  else if (activity.minMinutes > profile.minutesPerSession) score -= 12;

  // Social preference is not captured directly, but group formats help
  // adherence for mood and recovery goals.
  if ((profile.primaryGoal === "mood_depression" || profile.primaryGoal === "addiction_recovery") && activity.social === "group") {
    score += 8;
  }

  // Age-appropriate nudges.
  if (profile.age >= 65 && (activity.category === "functional" || activity.category === "martial_arts")) score += 6;
  if (profile.age >= 65 && activity.impact === "high") score -= 12;

  return { activity, score, reasons };
}

export function eligibleActivities(profile: FitnessProfile, safety: SafetyReport, merged: MergedGoal): ScoredActivity[] {
  return ACTIVITIES.filter((a) => isActivityEligible(a, profile, safety, merged))
    .map((a) => scoreActivity(a, profile, merged, safety))
    .sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ *
 * Weekly split allocation
 * ------------------------------------------------------------------ */

function allocateBuckets(merged: MergedGoal, days: number, pool: ScoredActivity[]): ModalityBucket[] {
  const available = new Set<ModalityBucket>();
  pool.forEach((s) => s.activity.buckets.forEach((b) => available.add(b)));

  const ranked = (Object.entries(merged.bucketWeights) as [ModalityBucket, number][])
    .filter(([bucket, weight]) => weight > 0 && available.has(bucket))
    .sort((a, b) => b[1] - a[1]);

  if (!ranked.length) return Array.from({ length: days }, () => "active_recovery" as ModalityBucket);

  const total = ranked.reduce((sum, [, w]) => sum + w, 0);
  const slots: ModalityBucket[] = [];

  // Proportional allocation, then largest-remainder to fill.
  const remainders: { bucket: ModalityBucket; remainder: number }[] = [];
  for (const [bucket, weight] of ranked) {
    const exact = (weight / total) * days;
    const whole = Math.floor(exact);
    for (let i = 0; i < whole; i += 1) slots.push(bucket);
    remainders.push({ bucket, remainder: exact - whole });
  }
  remainders.sort((a, b) => b.remainder - a.remainder);
  let index = 0;
  while (slots.length < days) {
    slots.push(remainders[index % remainders.length].bucket);
    index += 1;
  }
  slots.length = days;

  // Guarantee the top-two stimuli appear at least once.
  for (const [bucket] of ranked.slice(0, 2)) {
    if (!slots.includes(bucket)) slots[slots.length - 1] = bucket;
  }

  return slots;
}

/** Spreads hard days apart and puts the heaviest stimulus early in the week. */
function orderWeek(buckets: ModalityBucket[], daysPerWeek: number): (ModalityBucket | "rest")[] {
  const hard = new Set<ModalityBucket>(["cardio_interval", "strength", "sport_play"]);
  const sortedByLoad = [...buckets].sort((a, b) => Number(hard.has(b)) - Number(hard.has(a)));

  const week: (ModalityBucket | "rest")[] = Array.from({ length: 7 }, () => "rest");
  // Even spacing of training days across the week.
  const trainingDayIndices: number[] = [];
  for (let i = 0; i < daysPerWeek; i += 1) {
    trainingDayIndices.push(Math.round((i * 7) / daysPerWeek) % 7);
  }
  const unique = [...new Set(trainingDayIndices)];
  let cursor = 0;
  while (unique.length < daysPerWeek && cursor < 7) {
    if (!unique.includes(cursor)) unique.push(cursor);
    cursor += 1;
  }
  unique.sort((a, b) => a - b);

  // Interleave hard and easy so two hard days rarely sit back to back.
  const hardOnes = sortedByLoad.filter((b) => hard.has(b));
  const easyOnes = sortedByLoad.filter((b) => !hard.has(b));
  const interleaved: ModalityBucket[] = [];
  while (hardOnes.length || easyOnes.length) {
    if (hardOnes.length) interleaved.push(hardOnes.shift()!);
    if (easyOnes.length) interleaved.push(easyOnes.shift()!);
  }

  unique.slice(0, daysPerWeek).forEach((dayIndex, i) => {
    week[dayIndex] = interleaved[i] ?? "active_recovery";
  });

  return week;
}

/* ------------------------------------------------------------------ *
 * Day construction
 * ------------------------------------------------------------------ */

/**
 * Picks the best activity for a day's stimulus. Candidates whose *primary*
 * bucket is the requested one rank above those where it is incidental, so a
 * strength day gets a strength exercise rather than something that merely
 * involves muscle. `minMinutes` keeps 2-minute micro-drills out of main slots.
 */
function pickForBucket(
  pool: ScoredActivity[],
  bucket: ModalityBucket,
  used: Set<string>,
  options: { fallbackAllowed?: boolean; minUsableMinutes?: number; slotMinutes?: number } = {},
): ScoredActivity | undefined {
  const { fallbackAllowed = true, minUsableMinutes = 0, slotMinutes } = options;
  // Weight by how central this stimulus is to the activity, so a strength day
  // gets an exercise built for strength rather than a walk that happens to
  // involve some. Cardio a strength day merely touches ranks below it.
  const rank = (s: ScoredActivity) => {
    const position = s.activity.buckets.indexOf(bucket);
    const emphasis = position === 0 ? 1.6 : position === 1 ? 1.15 : 1;
    return Math.max(s.score, 1) * emphasis;
  };
  // The slot has to be able to hold the activity's own minimum dose.
  const fits = (s: ScoredActivity) =>
    s.activity.maxMinutes >= minUsableMinutes && (slotMinutes === undefined || s.activity.minMinutes <= slotMinutes);

  const candidates = pool
    .filter((s) => s.activity.buckets.includes(bucket))
    .filter(fits)
    .sort((a, b) => rank(b) - rank(a));

  const fresh = candidates.find((s) => !used.has(s.activity.id));
  if (fresh) return fresh;
  if (candidates.length) return candidates[0];
  if (!fallbackAllowed) return undefined;
  const anyFits = pool.filter(fits);
  return anyFits.find((s) => !used.has(s.activity.id)) ?? anyFits[0] ?? pool[0];
}

function pickByCategory(
  pool: ScoredActivity[],
  categories: string[],
  used: Set<string>,
  minUsableMinutes = 0,
  slotMinutes?: number,
): ScoredActivity | undefined {
  const matches = pool.filter(
    (s) =>
      categories.includes(s.activity.category) &&
      s.activity.maxMinutes >= minUsableMinutes &&
      (slotMinutes === undefined || s.activity.minMinutes <= slotMinutes),
  );
  return matches.find((s) => !used.has(s.activity.id)) ?? matches[0];
}

/**
 * Warm-ups and cool-downs are ordered by explicit preference, because "any
 * mobility activity" produces odd results — a cool-down stretch has no
 * business opening a session, and a dynamic warm-up has none closing one.
 */
const WARMUP_PREFERENCE = [
  "mobility_dynamic_warmup",
  "walk_indoor_marching",
  "walk_brisk_outdoor",
  "mobility_hip_routine",
  "mobility_thoracic",
  "yoga_sun_salutation",
  "breath_diaphragmatic",
  "walk_indoor_treadmill",
];

const COOLDOWN_PREFERENCE = [
  "mobility_static_stretch",
  "breath_diaphragmatic",
  "breath_extended_exhale",
  "breath_coherent",
  "meditation_body_scan",
  "yoga_nidra",
  "mobility_foam_rolling",
  "recovery_easy_walk",
  "meditation_breath_focus",
];

function pickPreferred(
  pool: ScoredActivity[],
  preferredIds: string[],
  fallbackCategories: string[],
  used: Set<string>,
  minUsableMinutes = 0,
  slotMinutes?: number,
): ScoredActivity | undefined {
  for (const id of preferredIds) {
    const match = pool.find(
      (s) =>
        s.activity.id === id &&
        !used.has(id) &&
        s.activity.maxMinutes >= minUsableMinutes &&
        (slotMinutes === undefined || s.activity.minMinutes <= slotMinutes),
    );
    if (match) return match;
  }
  return pickByCategory(pool, fallbackCategories, used, minUsableMinutes, slotMinutes);
}

/**
 * Where this block actually happens: honour a stated indoor/outdoor
 * preference when the activity supports it, otherwise use the activity's
 * natural home (the first environment it lists).
 */
function resolveEnvironment(activity: ActivityDefinition, profile: FitnessProfile): Environment {
  if (profile.environmentPreference !== "both" && activity.environments.includes(profile.environmentPreference)) {
    return profile.environmentPreference;
  }
  return activity.environments[0];
}

function buildBlock(
  activity: ActivityDefinition,
  role: PlanBlock["role"],
  minutes: number,
  profile: FitnessProfile,
  safety: SafetyReport,
  merged: MergedGoal,
  pool: ScoredActivity[],
): PlanBlock {
  const cappedIntensity: Intensity =
    intensityRank(activity.intensity) > intensityRank(safety.intensityCeiling) ? safety.intensityCeiling : activity.intensity;
  const rpe = rpeWindow(cappedIntensity);

  const zones = safety.level !== "stop" && profile.restingHr !== undefined ? heartRateZones(profile.age, profile.restingHr) : heartRateZones(profile.age);
  const zoneIndex =
    cappedIntensity === "very_light" ? 0 : cappedIntensity === "light" ? 1 : cappedIntensity === "moderate" ? 2 : cappedIntensity === "vigorous" ? 3 : 4;
  const isCardio = activity.buckets.some((b) => b === "cardio_steady" || b === "cardio_interval");

  const modifications: string[] = [];
  const cautionHits = activity.tags.filter((t) => safety.cautionTags.includes(t));
  if (cautionHits.length) {
    modifications.push(
      `Keep this within a pain-free range — your profile flags ${cautionHits.map((t) => t.replace(/_/g, " ")).join(", ")} as needing care.`,
    );
  }
  if (intensityRank(activity.intensity) > intensityRank(cappedIntensity)) {
    modifications.push(`Intensity is capped at "${cappedIntensity.replace(/_/g, " ")}" for you — do the easier version of this session.`);
  }
  for (const conditionId of profile.conditions) {
    const condition = CONDITIONS[conditionId];
    if (condition?.preferredCategories.includes(activity.category) && condition.modifications[0]) {
      modifications.push(`${condition.label}: ${condition.modifications[0]}`);
    }
  }

  const swapOptions = pool
    .filter(
      (s) =>
        s.activity.id !== activity.id &&
        s.activity.buckets.some((b) => activity.buckets.includes(b)),
    )
    .slice(0, 4)
    .map((s) => ({
      id: s.activity.id,
      name: s.activity.name,
      environment: (s.activity.environments.includes("indoor") ? "indoor" : "outdoor") as Environment,
    }));

  const prescription = (() => {
    if (activity.buckets.includes("strength")) {
      const goal = merged.primary.id;
      if (goal === "muscle_gain" || goal === "weight_gain") return "3-4 sets of 8-12 reps, stopping 2 reps short of failure. Rest 90 seconds.";
      if (goal === "strength_performance") return "4-5 sets of 4-6 reps at a hard but controlled load. Rest 2-3 minutes.";
      if (goal === "senior_functional" || goal === "arthritis" || goal === "joint_pain") return "2-3 sets of 10-15 reps at a moderate load, full pain-free range. Rest 60-90 seconds.";
      return "3 sets of 10-12 reps, last 2-3 reps genuinely hard. Rest 60-90 seconds.";
    }
    if (activity.buckets.includes("cardio_interval")) return "Alternate hard efforts with easy recovery as described, and keep every recovery genuinely easy.";
    if (activity.buckets.includes("cardio_steady")) return `Hold a conversational effort for ${minutes} minutes.`;
    if (activity.buckets.includes("rehab_corrective")) return "2-3 sets, controlled tempo, stopping well short of any pain increase.";
    if (activity.buckets.includes("mobility_flexibility")) return "Hold each position 30-45 seconds, or 8-10 slow controlled reps.";
    if (activity.buckets.includes("mindbody_calm")) return "Slow and unforced. If it feels effortful, ease off.";
    return undefined;
  })();

  return {
    role,
    activityId: activity.id,
    name: activity.name,
    category: activity.category,
    environment: resolveEnvironment(activity, profile),
    minutes,
    prescription,
    rpeTarget: rpe,
    heartRateTarget: isCardio && safety.level !== "stop" ? { low: zones[zoneIndex].low, high: zones[zoneIndex].high, zone: zones[zoneIndex].zone } : null,
    estimatedCalories: estimateCalories(activity.met, profile.weightKg, minutes),
    modifications,
    cues: activity.formCues,
    swapOptions,
  };
}

function dailyTargets(profile: FitnessProfile, metrics: ReturnType<typeof deriveMetrics>, isRest: boolean) {
  return {
    steps: isRest ? Math.round(metrics.stepTarget * 0.7 / 500) * 500 : metrics.stepTarget,
    waterMl: metrics.waterMl,
    proteinG: metrics.proteinG,
    sleepHours: profile.age < 18 ? 9 : profile.age >= 65 ? 7.5 : 7.5,
    mindfulMinutes:
      profile.stressLevel === "severe" ? 20 : profile.stressLevel === "high" ? 15 : 10,
    standBreaks: 8,
  };
}

const MOTIVATION_LINES = [
  "You do not need to feel motivated. You need to start — the feeling follows.",
  "Consistency beats intensity every single week. Show up.",
  "The session you almost skipped is the one that builds the habit.",
  "Small and repeatable beats big and abandoned.",
  "Your future self is built out of ordinary days like this one.",
  "Progress is not linear. Turning up is.",
  "A shorter session done is infinitely better than a perfect one skipped.",
];

/* ------------------------------------------------------------------ *
 * Plan assembly
 * ------------------------------------------------------------------ */

export interface BuildPlanOptions {
  weeks?: number;
  startDate?: string;
}

export function buildFitnessPlan(profile: FitnessProfile, options: BuildPlanOptions = {}): FitnessPlan {
  const weeksCount = Math.min(Math.max(options.weeks ?? 4, 1), 12);
  const safety = buildSafetyReport(profile);
  const merged = mergeGoals(profile);

  // Start volume from where the person actually is, then progress toward target.
  const startingWeekly = Math.max(
    60,
    Math.min(
      merged.weeklyMinutesTarget,
      Math.round(
        (profile.currentWeeklyMinutes ??
          ({ sedentary: 30, light: 80, moderate: 150, active: 220, very_active: 300 } as const)[profile.activityLevel]) * 1.15,
      ),
    ),
  );
  const metrics = deriveMetrics(profile, merged.primary, merged.weeklyMinutesTarget);

  const pool = eligibleActivities(profile, safety, merged);
  const daysPerWeek = Math.min(Math.max(profile.daysPerWeek, 1), 7);
  const buckets = allocateBuckets(merged, daysPerWeek, pool);
  const weekLayout = orderWeek(buckets, daysPerWeek);

  const warnings: string[] = [];
  if (!pool.length) {
    // Name the actual cause, so the fix is obvious.
    if (profile.dislikedCategories.length >= 8) {
      warnings.push(
        `You have excluded ${profile.dislikedCategories.length} activity categories, which leaves nothing to prescribe. Re-enable a few — even walking or mobility work alone is enough to build a plan around.`,
      );
    } else if (profile.availableEquipment.filter((item) => item !== "none").length === 0 && profile.environmentPreference !== "both") {
      warnings.push(
        "With no equipment and only one environment allowed, nothing in the library fits. Allowing both indoor and outdoor sessions, or adding a mat, opens up a workable plan.",
      );
    } else {
      warnings.push(
        "Your safety constraints ruled out every activity in the library. That usually means this profile needs a clinician's input before any programme — please speak to your doctor or physiotherapist about what is appropriate for you.",
      );
    }
  }
  if (pool.length && pool.length < 12) {
    warnings.push(
      `Only ${pool.length} activities passed your safety and equipment filters, so variety is limited. Adding equipment (a mat and a resistance band go a long way) or allowing both indoor and outdoor sessions would widen the plan considerably.`,
    );
  }
  if (safety.level === "clearance_required") {
    warnings.push("Get medical clearance before starting this plan. It has been generated so you can take it to your clinician and discuss it.");
  }
  if (safety.blocksPlan) {
    warnings.push("Based on your screening answers, do not start this plan yet. The symptoms you reported need medical assessment first.");
  }
  if (profile.minutesPerSession < merged.sessionMinutes.min) {
    warnings.push(
      `You have ${profile.minutesPerSession} minutes per session but your goals suit at least ${merged.sessionMinutes.min}. Sessions are shortened to fit — expect slower progress, which is still progress.`,
    );
  }

  const weeks: PlanWeek[] = [];
  for (let weekIndex = 1; weekIndex <= weeksCount; weekIndex += 1) {
    // Progression with a planned easier week every fourth week.
    const isDeload = weekIndex % 4 === 0 && weeksCount >= 4;
    const growth = (1 + merged.progressionRate) ** (weekIndex - 1);
    const weeklyMinutes = isDeload
      ? Math.round(startingWeekly * growth * 0.7)
      : Math.min(Math.round(startingWeekly * growth), Math.round(merged.weeklyMinutesTarget * 1.1));

    // Session length is bounded by what the user said they have available, so
    // progression is expressed as a ramp toward that ceiling (plus the rising
    // load prescriptions inside each block), not by inventing extra time.
    const sessionCeiling = Math.min(profile.minutesPerSession, merged.sessionMinutes.max);
    const rampStart = profile.activityLevel === "sedentary" || profile.experience === "beginner" ? 0.7 : 0.85;
    const rampFactor = isDeload ? 0.7 : Math.min(1, rampStart + (weekIndex - 1) * 0.12);
    const sessionMinutes = Math.max(10, Math.round(sessionCeiling * rampFactor));

    const used = new Set<string>();
    const days: DailyPlan[] = weekLayout.map((bucket, dayIdx) => {
      const weekday = WEEKDAYS[dayIdx];
      if (bucket === "rest" || !pool.length) {
        const recovery = pool.length
          ? pickPreferred(pool, COOLDOWN_PREFERENCE, ["recovery", "breathwork", "meditation", "mobility"], used, 15)
          : undefined;
        const blocks: PlanBlock[] = [];
        if (recovery) {
          used.add(recovery.activity.id);
          const recoveryMinutes = Math.min(
            recovery.activity.maxMinutes,
            Math.max(10, Math.min(20, recovery.activity.targetMinutes)),
          );
          blocks.push(buildBlock(recovery.activity, "cooldown", recoveryMinutes, profile, safety, merged, pool));
        }
        return {
          dayIndex: dayIdx + 1,
          weekday,
          focus: "Rest & recovery",
          bucket: "rest",
          isRestDay: true,
          totalMinutes: blocks.reduce((s, b) => s + b.minutes, 0),
          estimatedCalories: blocks.reduce((s, b) => s + b.estimatedCalories, 0),
          intensity: "very_light",
          blocks,
          dailyTargets: dailyTargets(profile, metrics, true),
          notes: [
            "Rest days are when adaptation actually happens — they are part of the plan, not a gap in it.",
            "Keep moving gently: hit your step target and stay out of the chair.",
          ],
          motivation: "Recovery is training. Take it as seriously as the hard days.",
        };
      }

      const blocks: PlanBlock[] = [];
      // Nothing repeats inside a single day, so warm-up, main and cool-down are
      // always three different things.
      const usedToday = new Set<string>();

      // Warm-up runs longer where the profile calls for it (arthritic joints,
      // asthma, cardiac and migraine all benefit from a gradual on-ramp).
      const needsLongWarmup =
        profile.conditions.includes("asthma") ||
        profile.conditions.includes("migraine") ||
        profile.conditions.includes("coronary_artery_disease") ||
        profile.conditions.some((c) => c.includes("arthritis") || c.includes("osteoarthritis"));
      const warmupCeiling = needsLongWarmup ? 12 : 8;
      // Where a condition makes the on-ramp clinically important, the warm-up
      // gets a floor even on a short session — it takes minutes from the main
      // block rather than being dropped.
      const warmupFloor = needsLongWarmup ? 8 : 3;
      const cooldownMinutes = Math.max(3, Math.min(10, Math.round(sessionMinutes * 0.18)));
      const warmupMinutes = Math.max(
        3,
        Math.min(
          warmupCeiling,
          Math.max(warmupFloor, Math.round(sessionMinutes * 0.25)),
          Math.max(3, sessionMinutes - cooldownMinutes - 8),
        ),
      );

      // The session budget is a hard ceiling: the user told us how long they
      // have, so blocks are allocated inside it rather than overflowing it.
      let remaining = sessionMinutes;
      const includeWarmup = sessionMinutes >= warmupMinutes + cooldownMinutes + 5;
      const mainBudget = Math.max(
        5,
        sessionMinutes - (includeWarmup ? warmupMinutes : 0) - cooldownMinutes,
      );

      // The main block is chosen first and gets the bulk of the session.
      const main = pickForBucket(pool, bucket, used, {
        minUsableMinutes: Math.min(15, mainBudget),
        slotMinutes: mainBudget,
      });

      if (main) {
        used.add(main.activity.id);
        usedToday.add(main.activity.id);
      }

      const warmup = includeWarmup
        ? pickPreferred(pool, WARMUP_PREFERENCE, ["mobility", "walking", "breathwork"], usedToday, 0, warmupMinutes)
        : undefined;
      if (warmup) {
        usedToday.add(warmup.activity.id);
        blocks.push(buildBlock(warmup.activity, "warmup", warmupMinutes, profile, safety, merged, pool));
        remaining -= warmupMinutes;
      }

      if (main) {
        const finalMain = Math.max(
          1,
          Math.min(main.activity.maxMinutes, mainBudget, remaining - Math.min(cooldownMinutes, remaining - 1)),
        );
        blocks.push(buildBlock(main.activity, "main", finalMain, profile, safety, merged, pool));
        remaining -= finalMain;
      }

      // Accessory: the second-priority stimulus, or targeted rehab where pain exists.
      if (remaining >= cooldownMinutes + 10) {
        const accessoryBucket: ModalityBucket = profile.painPoints.some((p) => p.severity >= 3)
          ? "rehab_corrective"
          : ((Object.entries(merged.bucketWeights) as [ModalityBucket, number][])
              .filter(([b]) => b !== bucket)
              .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mobility_flexibility");
        const accessory = pickForBucket(pool, accessoryBucket, usedToday, {
          fallbackAllowed: false,
          slotMinutes: remaining - cooldownMinutes,
        });
        if (accessory && !usedToday.has(accessory.activity.id)) {
          const accMinutes = Math.min(
            Math.max(accessory.activity.minMinutes, remaining - cooldownMinutes),
            accessory.activity.maxMinutes,
          );
          if (accMinutes >= accessory.activity.minMinutes && accMinutes <= remaining - cooldownMinutes) {
            used.add(accessory.activity.id);
            usedToday.add(accessory.activity.id);
            blocks.push(buildBlock(accessory.activity, "accessory", accMinutes, profile, safety, merged, pool));
            remaining -= accMinutes;
          }
        }
      }

      // Cool-down / calm work always closes the session.
      const cooldownSlot = Math.max(3, Math.min(cooldownMinutes, remaining));
      const cooldown =
        pickPreferred(
          pool,
          COOLDOWN_PREFERENCE,
          ["mobility", "breathwork", "meditation", "recovery"],
          usedToday,
          0,
          cooldownSlot,
        ) ?? pickForBucket(pool, "mindbody_calm", usedToday, { fallbackAllowed: false, slotMinutes: cooldownSlot });
      if (cooldown && !usedToday.has(cooldown.activity.id) && remaining >= 3) {
        usedToday.add(cooldown.activity.id);
        blocks.push(buildBlock(cooldown.activity, "cooldown", cooldownSlot, profile, safety, merged, pool));
        remaining -= cooldownSlot;
      }

      // Last-resort trim, so a stated 20-minute session is never a 26-minute one.
      let overflow = blocks.reduce((sum, b) => sum + b.minutes, 0) - sessionMinutes;
      if (overflow > 0) {
        for (const role of ["accessory", "cooldown", "warmup", "main"] as const) {
          for (const block of blocks) {
            if (overflow <= 0) break;
            if (block.role !== role) continue;
            const trim = Math.min(overflow, Math.max(0, block.minutes - 3));
            block.minutes -= trim;
            block.estimatedCalories = estimateCalories(
              getActivity(block.activityId)?.met ?? 3,
              profile.weightKg,
              block.minutes,
            );
            overflow -= trim;
          }
        }
      }

      const totalMinutes = blocks.reduce((s, b) => s + b.minutes, 0);
      const dominant = blocks.find((b) => b.role === "main");
      const dayIntensity: Intensity = dominant
        ? (getActivity(dominant.activityId)?.intensity ?? "moderate")
        : "light";

      const notes: string[] = [];
      if (bucket === "strength") notes.push("Log your loads today. Beating last week by one rep or 2.5 kg is exactly what progress looks like.");
      if (bucket === "cardio_interval") notes.push("Make the recoveries genuinely easy — that is what lets the hard parts stay hard.");
      if (bucket === "mindbody_calm") notes.push("No performance target today. The only goal is to finish calmer than you started.");
      if (bucket === "rehab_corrective") notes.push("Quality over quantity. If pain rises above 3-4/10 or lingers the next day, reduce the dose.");
      if (bucket === "sport_play") notes.push("Warm up properly first — most sport injuries happen in the first ten minutes.");
      if (needsLongWarmup && warmupMinutes >= 8) {
        notes.push(
          "Your warm-up is deliberately long. For your conditions the gradual on-ramp is the part that keeps the session safe, so do not trim it to buy time for the main work.",
        );
      }
      if (blocks.some((b) => b.environment === "outdoor")) {
        notes.push("Outdoor session: check the weather and air quality, and use the indoor swap if either is poor.");
      }
      if (profile.preferredTime === "early_morning" || profile.preferredTime === "morning") {
        notes.push("Morning session: extend the warm-up a little — tissues are stiffer on waking.");
      }
      if (profile.preferredTime === "night" && intensityRank(dayIntensity) >= intensityRank("vigorous")) {
        notes.push("This is a harder session and you train late — finish at least 3 hours before bed, or swap it with a calmer day.");
      }

      return {
        dayIndex: dayIdx + 1,
        weekday,
        focus: BUCKET_FOCUS[bucket],
        bucket,
        isRestDay: false,
        totalMinutes,
        estimatedCalories: blocks.reduce((s, b) => s + b.estimatedCalories, 0),
        intensity: dayIntensity,
        blocks,
        dailyTargets: dailyTargets(profile, metrics, false),
        notes,
        motivation: MOTIVATION_LINES[(dayIdx + weekIndex) % MOTIVATION_LINES.length],
      };
    });

    const plannedMinutes = days.reduce((sum, day) => sum + day.totalMinutes, 0);
    weeks.push({
      weekIndex,
      phase: weekIndex === 1 ? "onboarding" : isDeload ? "deload" : weekIndex <= 2 ? "build" : "progress",
      focus:
        weekIndex === 1
          ? "Establish the routine — finish every session feeling like you could have done a little more"
          : isDeload
            ? "Planned easier week: volume down about 30% so your body consolidates the gains"
            : `Build week ${weekIndex}: sessions lengthen toward your ${Math.min(profile.minutesPerSession, merged.sessionMinutes.max)}-minute ceiling, and loads go up`,
      progressionNote: isDeload
        ? "Deload week: volume drops on purpose. Adaptation happens when the stress comes off, so resist the urge to add sessions."
        : `${plannedMinutes} planned active minutes across ${daysPerWeek} sessions${weeklyMinutes > plannedMinutes ? `, working toward ${merged.weeklyMinutesTarget} a week as your availability allows` : ""}. Add reps, load or distance only if last week felt manageable.`,
      targetWeeklyMinutes: plannedMinutes,
      days,
    });
  }

  /* --- education cards, tailored to the profile --- */
  const education: { title: string; body: string }[] = [
    {
      title: `Why this plan looks like this for ${merged.primary.label.toLowerCase()}`,
      body: merged.primary.mechanism,
    },
    {
      title: "How to judge intensity",
      body: metrics.rpeGuidance +
        " As a rule: RPE 3-4 means you could talk easily all day, 5-6 means conversation in full sentences, 7-8 means a few words at a time, 9-10 means you cannot speak.",
    },
    {
      title: "The 24-hour rule",
      body:
        "Judge every session by how you feel the next day, not during. Mild fatigue or muscle soreness is fine. Joint pain, swelling, or being wiped out the following day means the dose was too high — repeat the previous week instead of progressing.",
    },
    {
      title: "What actually drives results",
      body:
        "In order: consistency over months, total weekly volume, sleep, protein, then the specific exercises. People obsess over the last item and neglect the first four. Do not.",
    },
  ];
  if (metrics.calorieDelta !== 0) {
    education.push({
      title: "Your energy target",
      body: `You burn roughly ${metrics.tdee} kcal a day at your current activity level. Your target is ${metrics.calorieTarget} kcal (a ${metrics.calorieDelta > 0 ? "surplus" : "deficit"} of ${Math.abs(metrics.calorieDelta)} kcal), which works out to about ${Math.abs(metrics.weightChangePerWeekKg ?? 0)} kg per week. Exercise builds the engine; the food target sets the direction.`,
    });
  }
  if (profile.painPoints.length) {
    education.push({
      title: "Pain does not mean damage",
      body:
        "Persistent pain is a nervous-system output, not a direct readout of tissue harm. Graded movement is one of the most effective treatments, which is why this plan increases what you do rather than protecting you from it. Sharp, catching or radiating pain is the exception — that means stop.",
    });
  }
  if (profile.conditions.length) {
    education.push({
      title: "Exercise as treatment",
      body:
        "For almost every condition you listed, exercise is not merely permitted, it is part of the treatment — with effect sizes comparable to medication for blood pressure, blood sugar, depression, arthritis pain and falls. The constraints in this plan exist so you can do it safely, not to hold you back.",
    });
  }

  /* --- weather fallbacks: indoor alternative for every outdoor day --- */
  const weatherFallbacks = weeks[0].days
    .filter((day) => day.blocks.some((b) => b.environment === "outdoor"))
    .map((day) => {
      const outdoorBlock = day.blocks.find((b) => b.environment === "outdoor")!;
      const indoorSwap =
        pool.find(
          (s) =>
            s.activity.environments.includes("indoor") &&
            s.activity.buckets.some((b) => getActivity(outdoorBlock.activityId)?.buckets.includes(b)),
        )?.activity.name ?? "Indoor marching / on-the-spot walk";
      return { weekday: day.weekday, instead: outdoorBlock.name, use: indoorSwap };
    });

  /* --- scores --- */
  const prescribedBlocks = weeks[0].days.flatMap((d) => d.blocks.filter((b) => b.role === "main" || b.role === "accessory"));
  const onGoalBlocks = prescribedBlocks.filter((b) => {
    const activity = getActivity(b.activityId);
    if (!activity) return false;
    return activity.goodFor.includes(profile.primaryGoal) || activity.goodFor.some((g) => profile.goals.includes(g));
  });
  const goalMatchScore = prescribedBlocks.length
    ? Math.round((onGoalBlocks.length / prescribedBlocks.length) * 100)
    : 0;
  const categoriesUsed = new Set(weeks[0].days.flatMap((d) => d.blocks.map((b) => b.category)));
  const varietyScore = Math.min(100, categoriesUsed.size * 14);
  const feasibility = Math.round(
    100 -
      Math.min(40, Math.max(0, (merged.weeklyMinutesTarget - profile.daysPerWeek * profile.minutesPerSession) / 6)) -
      (pool.length < 12 ? 15 : 0),
  );
  const safetyScore =
    safety.level === "clear" ? 100 : safety.level === "caution" ? 85 : safety.level === "clearance_required" ? 60 : 30;

  const summaryParts = [
    `A ${weeksCount}-week, ${daysPerWeek}-day-a-week plan built around ${merged.primary.label.toLowerCase()}`,
  ];
  if (profile.goals.length > 1) {
    summaryParts.push(`while also supporting ${profile.goals.filter((g) => g !== profile.primaryGoal).map((g) => GOALS[g]?.label.toLowerCase()).filter(Boolean).slice(0, 3).join(", ")}`);
  }
  if (profile.conditions.length) {
    summaryParts.push(`adapted for ${profile.conditions.length} reported condition${profile.conditions.length > 1 ? "s" : ""}`);
  }
  if (safety.excludedTags.length) {
    summaryParts.push(`with ${safety.excludedTags.length} movement pattern${safety.excludedTags.length > 1 ? "s" : ""} excluded on safety grounds`);
  }

  return {
    id: `fitplan_${profile.id}_${weeksCount}w_${Date.now().toString(36)}`,
    profileId: profile.id,
    profileName: profile.name,
    createdAt: new Date().toISOString(),
    title: `${merged.primary.label} — ${weeksCount}-week activity plan`,
    summary: `${summaryParts.join(", ")}. Sessions average ${Math.min(profile.minutesPerSession, merged.sessionMinutes.max)} minutes, building from ${weeks[0].targetWeeklyMinutes} to about ${Math.max(...weeks.map((w) => w.targetWeeklyMinutes))} active minutes a week.`,
    goals: merged.all.map((g) => ({ id: g.id, label: g.label, purpose: g.purpose, mechanism: g.mechanism })),
    primaryGoal: profile.primaryGoal,
    metrics,
    safety,
    weeks,
    weeklySplit: weeks[0].days.map((d) => ({ weekday: d.weekday, focus: d.focus, minutes: d.totalMinutes })),
    trackedMetrics: merged.keyMetrics,
    nonNegotiables: merged.nonNegotiables,
    education,
    warnings,
    adherenceTips: [
      "Put every session in your calendar as an appointment with yourself. Unscheduled exercise is optional exercise.",
      `Define your minimum version now: on a bad day, ${Math.max(5, Math.round(profile.minutesPerSession * 0.25))} minutes still counts and still keeps the streak.`,
      "Never miss twice. One missed session is life; two in a row is a new pattern.",
      "Lay out your kit the night before — removing one decision measurably raises follow-through.",
      "Track the session, not the outcome. Weight and pain fluctuate daily; adherence is the thing you actually control.",
      ...merged.cautions.slice(0, 3),
    ],
    weatherFallbacks,
    scores: {
      safety: safetyScore,
      goalMatch: goalMatchScore,
      variety: varietyScore,
      feasibility: Math.max(0, Math.min(100, feasibility)),
      overall: Math.round((safetyScore + goalMatchScore + varietyScore + Math.max(0, Math.min(100, feasibility))) / 4),
    },
  };
}

export { CATEGORY_LABELS };
