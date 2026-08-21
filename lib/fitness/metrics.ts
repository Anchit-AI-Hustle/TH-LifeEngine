/**
 * Derived health metrics.
 *
 * Everything here is computed from the profile — BMI banding (with the lower
 * South-Asian cut-offs where relevant), energy needs, macro and hydration
 * targets, heart-rate zones and step targets — and is used both to set the
 * plan's dosage and to give the tracker something to measure against.
 */

import type { DerivedMetrics, FitnessProfile, GoalDefinition, Intensity } from "./types";
import { MEDICATIONS } from "./conditions";

const ACTIVITY_FACTORS: Record<FitnessProfile["activityLevel"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Mifflin-St Jeor. For "other", the male and female equations are averaged. */
export function basalMetabolicRate(profile: FitnessProfile): number {
  const { weightKg: w, heightCm: h, age } = profile;
  const male = 10 * w + 6.25 * h - 5 * age + 5;
  const female = 10 * w + 6.25 * h - 5 * age - 161;
  if (profile.sex === "male") return male;
  if (profile.sex === "female") return female;
  return (male + female) / 2;
}

export function totalDailyEnergyExpenditure(profile: FitnessProfile): number {
  return basalMetabolicRate(profile) * ACTIVITY_FACTORS[profile.activityLevel];
}

export function bodyMassIndex(profile: FitnessProfile): number {
  const metres = profile.heightCm / 100;
  return profile.weightKg / (metres * metres);
}

/**
 * South-Asian and East-Asian populations carry metabolic risk at lower BMI,
 * so the lower WHO Asian cut-offs are used when ethnicity indicates it.
 */
export function bmiBand(bmi: number, asianCutoffs: boolean): string {
  if (asianCutoffs) {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 23) return "Healthy weight";
    if (bmi < 25) return "Overweight (Asian cut-off)";
    if (bmi < 30) return "Obesity class I (Asian cut-off)";
    return "Obesity class II+";
  }
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy weight";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity class I";
  if (bmi < 40) return "Obesity class II";
  return "Obesity class III";
}

/** Waist-to-height ratio is a better predictor of metabolic risk than BMI. */
export function waistRiskBand(ratio: number): string {
  if (ratio < 0.4) return "Below the healthy range — check with a clinician";
  if (ratio < 0.5) return "Healthy — keep it under 0.5";
  if (ratio < 0.6) return "Increased risk — waist reduction is worth targeting";
  return "High risk — waist reduction should be a priority";
}

/** Tanaka: more accurate across ages than the old 220-age rule. */
export function estimatedMaxHeartRate(age: number): number {
  return Math.round(208 - 0.7 * age);
}

/**
 * Karvonen zones when resting HR is known (more individualised), otherwise
 * simple percentage-of-max zones.
 */
export function heartRateZones(age: number, restingHr?: number) {
  const max = estimatedMaxHeartRate(age);
  const bands: { zone: string; lowPct: number; highPct: number; purpose: string }[] = [
    { zone: "Zone 1 — very light", lowPct: 0.5, highPct: 0.6, purpose: "Warm-up, recovery, and the easy end of daily walking" },
    { zone: "Zone 2 — light/aerobic base", lowPct: 0.6, highPct: 0.7, purpose: "Fat oxidation and aerobic base; you can hold a conversation" },
    { zone: "Zone 3 — moderate", lowPct: 0.7, highPct: 0.8, purpose: "Aerobic fitness and endurance; speaking in short sentences" },
    { zone: "Zone 4 — hard", lowPct: 0.8, highPct: 0.9, purpose: "Raises your lactate threshold; only a word or two at a time" },
    { zone: "Zone 5 — maximal", lowPct: 0.9, highPct: 1.0, purpose: "Peak capacity; short intervals only" },
  ];
  return bands.map((band) => {
    if (restingHr && restingHr > 30 && restingHr < 120) {
      const reserve = max - restingHr;
      return {
        zone: band.zone,
        low: Math.round(restingHr + reserve * band.lowPct),
        high: Math.round(restingHr + reserve * band.highPct),
        purpose: band.purpose,
      };
    }
    return {
      zone: band.zone,
      low: Math.round(max * band.lowPct),
      high: Math.round(max * band.highPct),
      purpose: band.purpose,
    };
  });
}

/** Target RPE window (1-10 scale) for an intensity label. */
export function rpeWindow(intensity: Intensity): [number, number] {
  switch (intensity) {
    case "very_light":
      return [2, 3];
    case "light":
      return [3, 4];
    case "moderate":
      return [5, 6];
    case "vigorous":
      return [7, 8];
    case "maximal":
      return [8, 10];
  }
}

/** kcal = MET x 3.5 x kg / 200 x minutes. */
export function estimateCalories(met: number, weightKg: number, minutes: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

function calorieDelta(balance: GoalDefinition["energyBalance"], tdee: number): number {
  switch (balance) {
    case "deficit":
      // Cap at 750 kcal, and never more than ~22% of maintenance.
      return -Math.min(750, Math.round(tdee * 0.22));
    case "mild_deficit":
      return -Math.min(400, Math.round(tdee * 0.12));
    case "maintenance":
      return 0;
    case "mild_surplus":
      return Math.min(250, Math.round(tdee * 0.08));
    case "surplus":
      return Math.min(450, Math.round(tdee * 0.15));
  }
}

function stepTarget(profile: FitnessProfile, goal: GoalDefinition): number {
  const base =
    profile.activityLevel === "sedentary" ? 6000 : profile.activityLevel === "light" ? 7500 : 9000;
  const goalBump =
    goal.id === "weight_loss" || goal.id === "belly_fat" || goal.id === "blood_sugar" || goal.id === "desk_job_reset"
      ? 2000
      : goal.id === "energy_fatigue" || goal.id === "long_covid" || goal.id === "post_surgery" || goal.id === "cancer_recovery"
        ? -2500
        : 0;
  const ageAdjust = profile.age >= 70 ? -1500 : profile.age >= 60 ? -800 : 0;
  const mobilityAdjust = profile.canWalk30MinUnaided ? 0 : -3000;
  return Math.max(2000, Math.round((base + goalBump + ageAdjust + mobilityAdjust) / 500) * 500);
}

/**
 * Builds the full metric set. `goal` is the merged primary goal definition, so
 * energy balance and protein reflect the user's actual purpose.
 */
export function deriveMetrics(
  profile: FitnessProfile,
  goal: GoalDefinition,
  weeklyMinutesTarget: number,
): DerivedMetrics {
  const asianCutoffs = profile.ethnicity === "south_asian" || profile.ethnicity === "east_asian";
  const bmi = bodyMassIndex(profile);
  const bmr = basalMetabolicRate(profile);
  const tdee = totalDailyEnergyExpenditure(profile);

  let delta = calorieDelta(goal.energyBalance, tdee);
  let calorieTarget = Math.round(tdee + delta);

  // Never prescribe below a safe floor, whatever the deficit maths says.
  const floor = profile.sex === "male" ? 1500 : 1200;
  if (calorieTarget < floor) {
    calorieTarget = floor;
    delta = calorieTarget - Math.round(tdee);
  }

  // Protein is set on a reference weight so it is not inflated by excess fat mass.
  const referenceWeight =
    bmi > (asianCutoffs ? 27 : 30)
      ? Math.round(((asianCutoffs ? 23 : 25) * (profile.heightCm / 100) ** 2 + profile.weightKg) / 2)
      : profile.weightKg;
  const proteinG = Math.round(referenceWeight * goal.proteinGPerKg);

  const waterMl = Math.round(
    Math.min(4000, profile.weightKg * 33 + (weeklyMinutesTarget > 200 ? 500 : 250)) / 50,
  ) * 50;

  const medsInvalidatingHr = profile.medications
    .map((id) => MEDICATIONS[id])
    .filter((m) => m?.invalidatesHeartRateZones);
  const arrhythmia = profile.conditions.includes("arrhythmia");
  const heartRateReliable = medsInvalidatingHr.length === 0 && !arrhythmia;

  const currentWeeklyMinutes =
    profile.currentWeeklyMinutes ??
    ({ sedentary: 20, light: 70, moderate: 150, active: 240, very_active: 330 } as const)[profile.activityLevel];

  // Weekly rate of change implied by the calorie delta (7,700 kcal ≈ 1 kg).
  const weightChangePerWeekKg = delta === 0 ? 0 : Number(((delta * 7) / 7700).toFixed(2));
  const targetGap = profile.targetWeightKg ? profile.targetWeightKg - profile.weightKg : undefined;
  const estimatedWeeksToTarget =
    targetGap && weightChangePerWeekKg !== 0 && Math.sign(targetGap) === Math.sign(weightChangePerWeekKg)
      ? Math.ceil(Math.abs(targetGap / weightChangePerWeekKg))
      : undefined;

  const waistToHeight = profile.waistCm ? Number((profile.waistCm / profile.heightCm).toFixed(3)) : undefined;

  return {
    bmi: Number(bmi.toFixed(1)),
    bmiCategory: bmiBand(bmi, asianCutoffs),
    bmiCutoffsUsed: asianCutoffs ? "south_asian" : "standard",
    waistToHeight,
    waistRisk: waistToHeight ? waistRiskBand(waistToHeight) : undefined,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    calorieDelta: delta,
    proteinG,
    waterMl,
    fibreG: profile.sex === "male" ? 38 : 30,
    stepTarget: stepTarget(profile, goal),
    maxHr: estimatedMaxHeartRate(profile.age),
    heartRateZones: heartRateReliable ? heartRateZones(profile.age, profile.restingHr) : null,
    heartRateReliable,
    rpeGuidance: heartRateReliable
      ? "Heart-rate zones are usable for you. RPE (how hard it feels, 1-10) is still the better day-to-day guide, because it accounts for sleep, stress and illness."
      : arrhythmia
        ? "Your heart rhythm makes heart-rate readings unreliable, so use RPE (how hard it feels, 1-10) as your only intensity gauge."
        : `Your medication (${medsInvalidatingHr.map((m) => m.label).join(", ")}) changes your heart-rate response, so heart-rate zones do not apply. Use RPE (1-10) instead.`,
    weeklyMinutesTarget,
    currentWeeklyMinutes,
    weightChangePerWeekKg,
    estimatedWeeksToTarget,
    fitnessAgeNote:
      profile.restingHr && profile.restingHr < 60
        ? "A resting heart rate under 60 suggests a good aerobic base — build on it."
        : profile.restingHr && profile.restingHr > 80
          ? "A resting heart rate above 80 usually falls by 5-10 beats within 8-12 weeks of consistent aerobic work."
          : "Track your resting heart rate on waking — it is the simplest marker of aerobic progress you have.",
  };
}
