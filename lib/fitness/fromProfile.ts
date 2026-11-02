/**
 * Start a fitness profile from a person saved in /lifeengine/profiles.
 *
 * The Profiles page stores name, age, gender, free-text goals, health notes,
 * experience and preferred time (and, for older rows, height and weight under
 * `demographics`). This maps those onto the fitness intake so the person does
 * not type them twice, and records the link in `sourceProfileId`.
 */

import { createBlankProfile } from "./samples";
import type { FitnessProfile, GoalId } from "./types";

/** The shape GET /api/lifeengine/profiles returns (only the fields used here). */
export type PersonProfile = {
  id: string;
  name?: string;
  age?: number | string;
  gender?: string;
  goals?: string[];
  healthConcerns?: string;
  experience?: string;
  preferredTime?: string;
  height?: number | string;
  weight?: number | string;
  demographics?: { age?: number | string; sex?: string; height?: number | string; weight?: number | string };
};

/** Keyword rules, most specific first, from free-text goals to fitness goal ids. */
const GOAL_RULES: [RegExp, GoalId][] = [
  [/weight\s*gain|gain\s*weight/i, "weight_gain"],
  [/belly/i, "belly_fat"],
  [/weight\s*loss|lose\s*weight|fat\s*loss/i, "weight_loss"],
  [/muscle/i, "muscle_gain"],
  [/maintain/i, "maintain_weight"],
  [/knee/i, "knee_pain"],
  [/back\s*pain/i, "back_pain"],
  [/neck|shoulder/i, "neck_shoulder_pain"],
  [/arthritis/i, "arthritis"],
  [/joint/i, "joint_pain"],
  [/flexib/i, "flexibility"],
  [/mobility/i, "mobility"],
  [/posture/i, "posture"],
  [/balance/i, "balance_fall_prevention"],
  [/blood\s*sugar|diabet|glucose/i, "blood_sugar"],
  [/blood\s*pressure|hypertension/i, "blood_pressure"],
  [/cholesterol/i, "cholesterol"],
  [/pcos|pcod|hormon/i, "pcos_hormonal"],
  [/thyroid/i, "thyroid_support"],
  [/heart/i, "heart_health"],
  [/endurance|stamina/i, "stamina"],
  [/breath/i, "breathing_capacity"],
  [/immun/i, "immunity"],
  [/anxiety/i, "anxiety_relief"],
  [/stress|calm|relax/i, "stress_calm"],
  [/mood|depress/i, "mood_depression"],
  [/sleep/i, "sleep_quality"],
  [/energy|fatigue/i, "energy_fatigue"],
  [/focus|concentrat/i, "focus_cognition"],
  [/strength|stronger/i, "strength_performance"],
  [/menopause/i, "menopause_support"],
  [/pregnan|prenatal/i, "prenatal"],
  [/postpartum|post-partum/i, "postpartum"],
  [/desk/i, "desk_job_reset"],
  [/migraine|headache/i, "migraine_relief"],
  [/digest/i, "digestive_health"],
];

/** Maps free-text goals to fitness goal ids; unknown goals are skipped. */
export function mapPersonGoals(goals: string[] = []): GoalId[] {
  const out: GoalId[] = [];
  for (const goal of goals) {
    const rule = GOAL_RULES.find(([pattern]) => pattern.test(goal));
    if (rule && !out.includes(rule[1])) out.push(rule[1]);
  }
  return out;
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value.trim()) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function toSex(value: unknown): FitnessProfile["sex"] {
  const v = typeof value === "string" ? value.toLowerCase() : "";
  if (v === "f" || v.startsWith("female")) return "female";
  if (v === "m" || v.startsWith("male")) return "male";
  return "other";
}

/**
 * A new fitness profile prefilled from a person. Height and weight are left at
 * 0 (shown empty) when the person has none, so the intake asks for them.
 */
export function fitnessProfileFromPerson(person: PersonProfile): FitnessProfile {
  const blank = createBlankProfile();
  const age = toNumber(person.age) ?? toNumber(person.demographics?.age);
  const height = toNumber(person.height) ?? toNumber(person.demographics?.height);
  const weight = toNumber(person.weight) ?? toNumber(person.demographics?.weight);
  const goals = mapPersonGoals(person.goals);
  const experience = ["beginner", "intermediate", "advanced"].includes(person.experience ?? "")
    ? (person.experience as FitnessProfile["experience"])
    : blank.experience;
  const preferredTime = ["morning", "evening", "flexible"].includes(person.preferredTime ?? "")
    ? (person.preferredTime as FitnessProfile["preferredTime"])
    : blank.preferredTime;
  const notes = person.healthConcerns?.trim();

  return {
    ...blank,
    name: person.name?.trim() ?? "",
    sourceProfileId: person.id,
    age: age ? Math.round(age) : blank.age,
    sex: toSex(person.gender ?? person.demographics?.sex),
    heightCm: height && height >= 90 && height <= 240 ? Math.round(height) : 0,
    weightKg: weight && weight >= 20 && weight <= 300 ? weight : 0,
    goals,
    primaryGoal: goals[0] ?? blank.primaryGoal,
    experience,
    preferredTime,
    medicalNotes: notes || undefined,
  };
}
