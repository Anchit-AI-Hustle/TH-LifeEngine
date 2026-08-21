/**
 * Pre-participation safety screening.
 *
 * Merges the PAR-Q+ style red-flag screen, every reported condition, every
 * medication, current pain and recent injuries into one SafetyReport. The
 * strictest constraint from any source always wins, and the report can block
 * the plan outright when medical clearance is genuinely needed first.
 */

import type {
  ActivityTag,
  FitnessProfile,
  ImpactLevel,
  Intensity,
  JointLoad,
  SafetyLevel,
  SafetyReport,
} from "./types";
import { CONDITIONS, MEDICATIONS } from "./conditions";

const INTENSITY_ORDER: Intensity[] = ["very_light", "light", "moderate", "vigorous", "maximal"];
const IMPACT_ORDER: ImpactLevel[] = ["none", "low", "moderate", "high"];
const JOINT_ORDER: JointLoad[] = ["minimal", "low", "moderate", "high"];

export function intensityRank(value: Intensity): number {
  return INTENSITY_ORDER.indexOf(value);
}
export function impactRank(value: ImpactLevel): number {
  return IMPACT_ORDER.indexOf(value);
}
export function jointRank(value: JointLoad): number {
  return JOINT_ORDER.indexOf(value);
}

function strictestIntensity(a: Intensity, b?: Intensity): Intensity {
  if (!b) return a;
  return intensityRank(a) <= intensityRank(b) ? a : b;
}
function strictestImpact(a: ImpactLevel, b?: ImpactLevel): ImpactLevel {
  if (!b) return a;
  return impactRank(a) <= impactRank(b) ? a : b;
}
function strictestJoint(a: JointLoad, b?: JointLoad): JointLoad {
  if (!b) return a;
  return jointRank(a) <= jointRank(b) ? a : b;
}

/** Screen answers that mean "get cleared before starting", with wording. */
const SCREEN_REASONS: { key: keyof FitnessProfile["screen"]; reason: string; stop?: boolean }[] = [
  { key: "chestPainAtRestOrExertion", reason: "You reported chest pain at rest or during exertion. This needs medical assessment before any exercise programme.", stop: true },
  { key: "dizzinessOrFainting", reason: "You reported dizziness or fainting. Get this investigated before starting — it can have cardiac causes.", stop: true },
  { key: "acuteIllnessOrFever", reason: "You reported a current illness or fever. Rest until you are 24 hours symptom-free, then start gently.", stop: true },
  { key: "uncontrolledBloodPressure", reason: "You reported uncontrolled blood pressure. Exercise is part of the treatment, but resting pressure above 180/110 should be treated first." },
  { key: "diagnosedHeartCondition", reason: "You reported a diagnosed heart condition, so your intensity ceiling should be set by your cardiologist or a cardiac rehab team." },
  { key: "advisedByDoctorToAvoidExercise", reason: "You reported being advised by a doctor to avoid exercise. That advice takes precedence over this plan." },
  { key: "unexplainedBreathlessness", reason: "You reported unexplained breathlessness. This needs assessment before adding training load." },
  { key: "unexplainedWeightLoss", reason: "You reported unexplained weight loss. This needs medical investigation, not a training plan." },
  { key: "currentlyPregnantWithComplications", reason: "You reported a pregnancy complication. Your obstetrician must set your activity limits." },
  { key: "recentSurgeryLast3Months", reason: "You had surgery within the last three months. Your surgeon's restrictions override everything in this plan." },
  { key: "boneJointProblemWorsenedByExercise", reason: "You reported a bone or joint problem that exercise makes worse. The plan is kept low-impact, but a physiotherapy assessment would help target it properly." },
  { key: "medicationForHeartOrBloodPressure", reason: "You take medication for your heart or blood pressure, so intensity is capped and heart-rate targets may not apply to you." },
];

export function buildSafetyReport(profile: FitnessProfile): SafetyReport {
  const excluded = new Set<ActivityTag>();
  const caution = new Set<ActivityTag>();
  const modifications = new Set<string>();
  const monitoring = new Set<string>();
  const redFlags = new Set<string>();
  const reasons: string[] = [];

  let intensityCeiling: Intensity = "maximal";
  let maxImpact: ImpactLevel = "high";
  let maxJointLoad: JointLoad = "high";
  let clearanceRequired = false;
  let hardStop = false;

  /* --- red-flag screen --- */
  for (const entry of SCREEN_REASONS) {
    if (profile.screen[entry.key]) {
      reasons.push(entry.reason);
      clearanceRequired = true;
      if (entry.stop) hardStop = true;
    }
  }
  if (profile.screen.chestPainAtRestOrExertion || profile.screen.diagnosedHeartCondition) {
    intensityCeiling = strictestIntensity("light", intensityCeiling);
    ["valsalva", "breath_retention", "max_heart_rate", "vigorous_intensity"].forEach((t) => excluded.add(t as ActivityTag));
  }
  if (profile.screen.uncontrolledBloodPressure) {
    intensityCeiling = strictestIntensity("light", intensityCeiling);
    ["valsalva", "breath_retention", "inversion", "max_heart_rate", "heavy_load"].forEach((t) => excluded.add(t as ActivityTag));
    monitoring.add("Blood pressure before and after each session until it is stable");
  }
  if (profile.screen.dizzinessOrFainting) {
    ["fall_risk", "balance_demand", "inversion", "max_heart_rate"].forEach((t) => excluded.add(t as ActivityTag));
    modifications.add("Change position slowly and always have support within reach");
  }
  if (profile.screen.recentSurgeryLast3Months) {
    intensityCeiling = strictestIntensity("very_light", intensityCeiling);
    maxImpact = strictestImpact("none", maxImpact);
    ["heavy_load", "high_impact", "jumping", "intra_abdominal_pressure", "valsalva", "explosive", "contact_risk"].forEach(
      (t) => excluded.add(t as ActivityTag),
    );
  }

  /* --- conditions --- */
  for (const id of profile.conditions) {
    const condition = CONDITIONS[id];
    if (!condition) continue;
    condition.avoidTags.forEach((t) => excluded.add(t));
    condition.cautionTags.forEach((t) => caution.add(t));
    condition.modifications.forEach((m) => modifications.add(m));
    condition.monitor.forEach((m) => monitoring.add(m));
    condition.redFlags.forEach((f) => redFlags.add(f));
    intensityCeiling = strictestIntensity(intensityCeiling, condition.intensityCeiling);
    maxImpact = strictestImpact(maxImpact, condition.maxImpact);
    maxJointLoad = strictestJoint(maxJointLoad, condition.maxJointLoad);
    if (condition.clearanceRequired) {
      clearanceRequired = true;
      reasons.push(`${condition.label}: medical clearance is recommended before starting a new exercise programme.`);
    }
  }

  /* --- medications --- */
  for (const id of profile.medications) {
    const med = MEDICATIONS[id];
    if (!med) continue;
    med.avoidTags.forEach((t) => excluded.add(t));
    med.exerciseImplications.forEach((m) => modifications.add(`${med.label}: ${m}`));
    med.monitor.forEach((m) => monitoring.add(m));
    intensityCeiling = strictestIntensity(intensityCeiling, med.intensityCeiling);
  }

  /* --- pregnancy / postpartum from profile fields --- */
  if (profile.pregnancyWeeks && profile.pregnancyWeeks > 0) {
    const pregnancy = CONDITIONS.pregnancy;
    pregnancy.avoidTags.forEach((t) => excluded.add(t));
    pregnancy.modifications.forEach((m) => modifications.add(m));
    pregnancy.redFlags.forEach((f) => redFlags.add(f));
    intensityCeiling = strictestIntensity("moderate", intensityCeiling);
    maxImpact = strictestImpact("low", maxImpact);
    if (profile.pregnancyWeeks >= 16) {
      excluded.add("supine_position");
      modifications.add(`At ${profile.pregnancyWeeks} weeks, no exercise lying flat on your back — use side-lying or inclined positions.`);
    }
    if (profile.pregnancyWeeks >= 28) {
      modifications.add("Third trimester: reduce balance demand and expect lower tolerance — that is normal, not a setback.");
    }
    clearanceRequired = true;
    reasons.push("Pregnancy: confirm your activity plan with your obstetrician or midwife.");
  }
  if (profile.postpartumWeeks !== undefined && profile.postpartumWeeks >= 0 && profile.postpartumWeeks < 52) {
    const pp = CONDITIONS.postpartum;
    pp.modifications.forEach((m) => modifications.add(m));
    if (profile.postpartumWeeks < 12) {
      pp.avoidTags.forEach((t) => excluded.add(t));
      intensityCeiling = strictestIntensity("light", intensityCeiling);
      maxImpact = strictestImpact("none", maxImpact);
      modifications.add(`At ${profile.postpartumWeeks} weeks postpartum: no running or jumping yet. Breath, pelvic floor and walking come first.`);
    } else {
      pp.cautionTags.forEach((t) => caution.add(t));
      excluded.add("intra_abdominal_pressure");
      modifications.add("Past 12 weeks postpartum: reintroduce impact gradually, and only while completely leak-free and pain-free.");
    }
  }

  /* --- current pain --- */
  for (const pain of profile.painPoints) {
    if (pain.severity >= 7 || pain.flareUp) {
      intensityCeiling = strictestIntensity("light", intensityCeiling);
      maxImpact = strictestImpact("low", maxImpact);
      modifications.add(
        `${pain.region.replace(/_/g, " ")} pain is currently high${pain.flareUp ? " and flaring" : ""} — work in a pain-free range only and keep sessions short.`,
      );
    }
    switch (pain.region) {
      case "lower_back":
      case "sacroiliac":
        ["spinal_flexion", "loaded_spine", "deep_twist"].forEach((t) => caution.add(t as ActivityTag));
        if (pain.severity >= 5) ["heavy_load", "high_impact", "jumping"].forEach((t) => excluded.add(t as ActivityTag));
        break;
      case "knee":
        ["deep_knee_flexion", "high_impact", "jumping"].forEach((t) => caution.add(t as ActivityTag));
        if (pain.severity >= 5) ["high_impact", "jumping", "running_gait", "explosive"].forEach((t) => excluded.add(t as ActivityTag));
        break;
      case "neck":
      case "upper_back":
        ["neck_loading", "inversion", "overhead_reach"].forEach((t) => caution.add(t as ActivityTag));
        if (pain.severity >= 5) ["inversion", "neck_loading"].forEach((t) => excluded.add(t as ActivityTag));
        break;
      case "shoulder":
        ["overhead_reach", "shoulder_end_range", "hanging_grip"].forEach((t) => caution.add(t as ActivityTag));
        if (pain.severity >= 5) ["overhead_reach", "hanging_grip"].forEach((t) => excluded.add(t as ActivityTag));
        break;
      case "hip":
        ["hip_end_range", "high_impact"].forEach((t) => caution.add(t as ActivityTag));
        break;
      case "ankle_foot":
        ["high_impact", "jumping", "running_gait"].forEach((t) => caution.add(t as ActivityTag));
        break;
      case "wrist_hand":
        ["wrist_loading", "hanging_grip"].forEach((t) => excluded.add(t as ActivityTag));
        break;
      case "elbow":
        ["hanging_grip", "heavy_load"].forEach((t) => caution.add(t as ActivityTag));
        break;
      case "generalised":
        ["max_heart_rate", "vigorous_intensity", "long_duration"].forEach((t) => caution.add(t as ActivityTag));
        break;
      default:
        break;
    }
    if (pain.chronic) {
      modifications.add(
        `Chronic ${pain.region.replace(/_/g, " ")} pain: use the 24-hour rule — pain up to 3-4/10 during movement is acceptable, but it must settle by the next day.`,
      );
    }
  }

  /* --- injuries --- */
  for (const injury of profile.injuries) {
    if (injury.monthsAgo <= 3) {
      intensityCeiling = strictestIntensity("light", intensityCeiling);
      maxImpact = strictestImpact("low", maxImpact);
      ["high_impact", "jumping", "explosive", "contact_risk", "heavy_load"].forEach((t) => excluded.add(t as ActivityTag));
      modifications.add(`Recent injury (${injury.description}, ${injury.monthsAgo} month(s) ago): no impact or heavy loading through that area yet.`);
      if (injury.surgical && !injury.clearedByClinician) {
        clearanceRequired = true;
        reasons.push(`Surgical injury (${injury.description}) not yet cleared by a clinician — get sign-off before loading it.`);
      }
    } else if (injury.monthsAgo <= 12 && !injury.clearedByClinician) {
      caution.add("high_impact");
      caution.add("explosive");
      modifications.add(`Previous injury (${injury.description}): rebuild impact and speed gradually, and compare both sides for strength.`);
    }
  }

  /* --- functional limits --- */
  if (!profile.canGetUpFromFloorUnaided) {
    excluded.add("floor_transfer");
    modifications.add("Floor exercises are replaced with seated or standing versions, since getting up from the floor is currently difficult.");
  }
  if (!profile.canWalk30MinUnaided) {
    caution.add("long_duration");
    modifications.add("Sessions are split into short bouts rather than one continuous block.");
  }

  /* --- environment & climate --- */
  if (profile.climate === "polluted_city") {
    caution.add("air_pollution_exposure");
    modifications.add("On high-pollution days, move the session indoors — hard breathing pulls far more particulate into the lungs.");
  }
  if (profile.climate === "hot_humid" || profile.climate === "hot_dry") {
    caution.add("heat_exposure");
    modifications.add("Train early morning or evening, and add 500 ml of fluid per hour of outdoor work.");
  }
  if (profile.noiseConstraint) {
    excluded.add("jumping");
    modifications.add("Jumping is excluded to keep sessions quiet for the people around you.");
  }
  if (profile.age >= 65) {
    caution.add("fall_risk");
    modifications.add("Balance work is always done with a wall or sturdy chair within arm's reach.");
  }
  if (profile.smoker) {
    monitoring.add("Breathlessness relative to effort");
    modifications.add("Extend warm-ups — smoking narrows the airways and makes the first 10 minutes disproportionately hard.");
  }

  /* --- baseline caps for deconditioned users --- */
  if (profile.activityLevel === "sedentary" && profile.experience === "beginner") {
    intensityCeiling = strictestIntensity("moderate", intensityCeiling);
    modifications.add("Starting from a sedentary baseline: the first two weeks build the habit, not the fitness. Intensity is deliberately capped.");
  }

  // Anything excluded outright should not also be merely cautioned.
  excluded.forEach((tag) => caution.delete(tag));

  const level: SafetyLevel = hardStop
    ? "stop"
    : clearanceRequired
      ? profile.hasMedicalClearance
        ? "caution"
        : "clearance_required"
      : caution.size || excluded.size
        ? "caution"
        : "clear";

  if (profile.hasMedicalClearance && clearanceRequired && !hardStop) {
    reasons.push("You have confirmed medical clearance, so the plan is generated with the constraints above applied.");
  }

  return {
    level,
    blocksPlan: hardStop,
    reasons,
    excludedTags: [...excluded],
    cautionTags: [...caution],
    requiredModifications: [...modifications],
    monitoring: [...monitoring],
    redFlags: [...redFlags],
    intensityCeiling,
    maxImpact,
    maxJointLoad,
    disclaimers: [
      "This plan is generated from the information you entered and is general wellness guidance, not medical advice, diagnosis or treatment.",
      "It does not replace your doctor, physiotherapist or any programme they have given you. Where the two differ, follow theirs.",
      "Stop exercising and seek medical help for chest pain or pressure, severe breathlessness, dizziness or fainting, sudden severe headache, or new numbness or weakness.",
      "Sharp, catching or radiating pain is a signal to stop, not to push through.",
    ],
  };
}

/** Blank screen, so new profiles start from an explicit "no" on every item. */
export function emptyScreen(): FitnessProfile["screen"] {
  return {
    chestPainAtRestOrExertion: false,
    diagnosedHeartCondition: false,
    dizzinessOrFainting: false,
    uncontrolledBloodPressure: false,
    boneJointProblemWorsenedByExercise: false,
    currentlyPregnantWithComplications: false,
    recentSurgeryLast3Months: false,
    acuteIllnessOrFever: false,
    medicationForHeartOrBloodPressure: false,
    advisedByDoctorToAvoidExercise: false,
    unexplainedBreathlessness: false,
    unexplainedWeightLoss: false,
  };
}

export const SCREEN_QUESTIONS: { key: keyof FitnessProfile["screen"]; question: string }[] = [
  { key: "chestPainAtRestOrExertion", question: "Do you get chest pain, pressure or tightness at rest or during activity?" },
  { key: "diagnosedHeartCondition", question: "Has a doctor ever told you that you have a heart condition?" },
  { key: "dizzinessOrFainting", question: "Do you lose balance from dizziness, or have you ever lost consciousness?" },
  { key: "uncontrolledBloodPressure", question: "Is your blood pressure currently uncontrolled (readings above 180/110)?" },
  { key: "boneJointProblemWorsenedByExercise", question: "Do you have a bone or joint problem that could be made worse by exercise?" },
  { key: "currentlyPregnantWithComplications", question: "Are you pregnant with any complication, or has your doctor restricted your activity?" },
  { key: "recentSurgeryLast3Months", question: "Have you had surgery in the last three months?" },
  { key: "acuteIllnessOrFever", question: "Are you currently unwell, feverish or recovering from an acute infection?" },
  { key: "medicationForHeartOrBloodPressure", question: "Do you take medication for your heart or blood pressure?" },
  { key: "advisedByDoctorToAvoidExercise", question: "Has a doctor ever advised you not to exercise, or to exercise only under supervision?" },
  { key: "unexplainedBreathlessness", question: "Do you get breathless at rest or with very mild effort?" },
  { key: "unexplainedWeightLoss", question: "Have you lost weight recently without trying to?" },
];
