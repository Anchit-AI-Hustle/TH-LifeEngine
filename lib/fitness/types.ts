/**
 * TH+ LifeEngine — Fitness & Health Activity Planner
 * Core domain types.
 *
 * The planner is a deterministic rule engine: a complete health profile in,
 * a safety-screened, purpose-driven daily activity plan out. No AI call is
 * required, so the planner works offline and produces reproducible output.
 */

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export type Sex = "male" | "female" | "other";

/** Where an activity can be performed. */
export type Environment = "indoor" | "outdoor";

/** Broad activity family shown to the user as a filter chip. */
export type ActivityCategory =
  | "running"
  | "walking"
  | "cycling"
  | "swimming"
  | "gym_strength"
  | "hiit"
  | "sports"
  | "yoga"
  | "pilates"
  | "mobility"
  | "breathwork"
  | "meditation"
  | "dance"
  | "martial_arts"
  | "rehab"
  | "functional"
  | "rowing"
  | "hiking"
  | "recovery";

/**
 * Training stimulus an activity delivers. Goals are expressed as weights over
 * these buckets, which is how the engine turns "reduce joint pain" into an
 * actual weekly split.
 */
export type ModalityBucket =
  | "cardio_steady"
  | "cardio_interval"
  | "strength"
  | "mobility_flexibility"
  | "mindbody_calm"
  | "sport_play"
  | "rehab_corrective"
  | "active_recovery"
  | "balance_coordination";

export type Intensity = "very_light" | "light" | "moderate" | "vigorous" | "maximal";
export type ImpactLevel = "none" | "low" | "moderate" | "high";
export type JointLoad = "minimal" | "low" | "moderate" | "high";
export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type Equipment =
  | "none"
  | "mat"
  | "resistance_band"
  | "dumbbells"
  | "kettlebell"
  | "barbell"
  | "machines"
  | "pull_up_bar"
  | "bench"
  | "stationary_bike"
  | "treadmill"
  | "rower"
  | "jump_rope"
  | "foam_roller"
  | "chair"
  | "stability_ball"
  | "pool"
  | "bicycle"
  | "shoes_running"
  | "racket"
  | "ball"
  | "gym_access"
  | "props_yoga"
  | "step_platform"
  | "trx"
  | "boxing_bag";

/**
 * Movement/physiological attributes used for contraindication matching.
 * A condition declares tags to avoid; an activity declares the tags it has.
 */
export type ActivityTag =
  | "high_impact"
  | "jumping"
  | "running_gait"
  | "spinal_flexion"
  | "spinal_extension"
  | "deep_twist"
  | "loaded_spine"
  | "inversion"
  | "overhead_reach"
  | "breath_retention"
  | "valsalva"
  | "heavy_load"
  | "contact_risk"
  | "fall_risk"
  | "balance_demand"
  | "prone_position"
  | "supine_position"
  | "heat_exposure"
  | "cold_exposure"
  | "sustained_forward_bend"
  | "deep_knee_flexion"
  | "wrist_loading"
  | "neck_loading"
  | "shoulder_end_range"
  | "hip_end_range"
  | "explosive"
  | "rapid_direction_change"
  | "long_duration"
  | "max_heart_rate"
  | "pollen_exposure"
  | "chlorine_exposure"
  | "intra_abdominal_pressure"
  | "hanging_grip"
  | "floor_transfer"
  | "single_leg"
  | "pelvic_floor_load"
  | "hypermobility_risk"
  | "vigorous_intensity"
  | "sun_exposure"
  | "air_pollution_exposure"
  | "high_coordination";

/* ------------------------------------------------------------------ *
 * Goals (the "purpose" the plan is built around)
 * ------------------------------------------------------------------ */

export type GoalFamily =
  | "body_composition"
  | "musculoskeletal"
  | "metabolic"
  | "cardio_respiratory"
  | "mental_wellbeing"
  | "life_stage"
  | "performance"
  | "recovery_rehab"
  | "longevity";

export type GoalId =
  // body composition
  | "weight_loss"
  | "belly_fat"
  | "weight_gain"
  | "muscle_gain"
  | "body_recomposition"
  | "maintain_weight"
  // musculoskeletal
  | "joint_pain"
  | "arthritis"
  | "knee_pain"
  | "back_pain"
  | "neck_shoulder_pain"
  | "bone_density"
  | "flexibility"
  | "mobility"
  | "posture"
  | "balance_fall_prevention"
  | "pelvic_floor"
  // metabolic
  | "blood_sugar"
  | "blood_pressure"
  | "cholesterol"
  | "pcos_hormonal"
  | "thyroid_support"
  | "fatty_liver"
  // cardio-respiratory
  | "heart_health"
  | "stamina"
  | "breathing_capacity"
  | "immunity"
  // mental wellbeing
  | "stress_calm"
  | "anxiety_relief"
  | "mood_depression"
  | "sleep_quality"
  | "energy_fatigue"
  | "focus_cognition"
  | "addiction_recovery"
  // life stage
  | "prenatal"
  | "postpartum"
  | "menopause_support"
  | "senior_functional"
  | "teen_fitness"
  | "desk_job_reset"
  // performance
  | "strength_performance"
  | "endurance_event"
  | "sports_performance"
  | "explosive_power"
  // recovery / rehab
  | "injury_rehab"
  | "post_surgery"
  | "long_covid"
  | "cancer_recovery"
  | "migraine_relief"
  | "digestive_health";

export type TrackedMetric =
  | "weight"
  | "waist"
  | "body_fat"
  | "steps"
  | "active_minutes"
  | "calories_burned"
  | "resting_hr"
  | "hrv"
  | "blood_pressure"
  | "blood_glucose"
  | "pain_score"
  | "stiffness_minutes"
  | "range_of_motion"
  | "sleep_hours"
  | "sleep_quality"
  | "mood"
  | "stress"
  | "energy"
  | "rpe"
  | "strength_load"
  | "distance"
  | "pace"
  | "breath_hold"
  | "flexibility_reach"
  | "balance_seconds"
  | "adherence";

export type EnergyBalance = "deficit" | "mild_deficit" | "maintenance" | "mild_surplus" | "surplus";

export interface GoalDefinition {
  id: GoalId;
  label: string;
  /** Plain-language purpose as the user would phrase it. */
  purpose: string;
  family: GoalFamily;
  /** Why the prescribed mix works — shown as "how this plan helps you". */
  mechanism: string;
  /** Relative weight (0-10) of each training stimulus in the weekly split. */
  bucketWeights: Partial<Record<ModalityBucket, number>>;
  primaryCategories: ActivityCategory[];
  /** Movement attributes to keep out of this goal's plan. */
  avoidTags: ActivityTag[];
  intensityCap: Intensity;
  sessionMinutes: { min: number; target: number; max: number };
  /** Weekly moderate-intensity-equivalent minutes to build toward. */
  weeklyMinutesTarget: number;
  /** Safe weekly volume increase, as a fraction (0.1 = 10%). */
  progressionRate: number;
  energyBalance: EnergyBalance;
  proteinGPerKg: number;
  keyMetrics: TrackedMetric[];
  /** Habits that matter more than any single workout. */
  nonNegotiables: string[];
  cautions: string[];
  successSignals: string[];
  expectedTimeline: string;
}

/* ------------------------------------------------------------------ *
 * Medical profile
 * ------------------------------------------------------------------ */

export type ConditionFamily =
  | "musculoskeletal"
  | "cardiovascular"
  | "metabolic_endocrine"
  | "respiratory"
  | "neurological"
  | "mental_health"
  | "digestive"
  | "reproductive"
  | "immune_oncology"
  | "renal_hepatic"
  | "sensory"
  | "other";

export interface ConditionDefinition {
  id: string;
  label: string;
  family: ConditionFamily;
  /** Hard filter: activities carrying these tags are excluded. */
  avoidTags: ActivityTag[];
  /** Soft filter: allowed, but flagged and intensity-reduced. */
  cautionTags: ActivityTag[];
  intensityCeiling?: Intensity;
  maxImpact?: ImpactLevel;
  maxJointLoad?: JointLoad;
  preferredCategories: ActivityCategory[];
  /** Modifications the plan must state explicitly. */
  modifications: string[];
  /** What the user should measure around sessions. */
  monitor: string[];
  /** Symptoms that mean stop exercising and seek care. */
  redFlags: string[];
  /** True when a clinician should sign off before starting. */
  clearanceRequired: boolean;
  /** Goals this condition naturally implies. */
  suggestedGoals: GoalId[];
  note: string;
}

export interface MedicationDefinition {
  id: string;
  label: string;
  /** Examples of drug classes/brands, for recognition only. */
  examples: string[];
  exerciseImplications: string[];
  avoidTags: ActivityTag[];
  intensityCeiling?: Intensity;
  /** True when heart-rate targets are unreliable and RPE must be used. */
  invalidatesHeartRateZones: boolean;
  monitor: string[];
}

export type PainRegion =
  | "neck"
  | "upper_back"
  | "lower_back"
  | "shoulder"
  | "elbow"
  | "wrist_hand"
  | "hip"
  | "knee"
  | "ankle_foot"
  | "sacroiliac"
  | "jaw"
  | "generalised";

export interface PainPoint {
  region: PainRegion;
  /** 0 = none, 10 = worst imaginable. */
  severity: number;
  /** Pain that has lasted 12+ weeks changes the prescription. */
  chronic: boolean;
  /** True when the area is currently inflamed/flared. */
  flareUp?: boolean;
  triggers?: string;
}

export interface InjuryHistory {
  description: string;
  region: PainRegion | "other";
  /** Months since injury/surgery. Recent (<3) blocks loading. */
  monthsAgo: number;
  surgical: boolean;
  clearedByClinician: boolean;
}

/** PAR-Q+ style red-flag screen. Any `true` gates the plan. */
export interface ReadinessScreen {
  chestPainAtRestOrExertion: boolean;
  diagnosedHeartCondition: boolean;
  dizzinessOrFainting: boolean;
  uncontrolledBloodPressure: boolean;
  boneJointProblemWorsenedByExercise: boolean;
  currentlyPregnantWithComplications: boolean;
  recentSurgeryLast3Months: boolean;
  acuteIllnessOrFever: boolean;
  medicationForHeartOrBloodPressure: boolean;
  advisedByDoctorToAvoidExercise: boolean;
  unexplainedBreathlessness: boolean;
  unexplainedWeightLoss: boolean;
}

/* ------------------------------------------------------------------ *
 * Full user profile
 * ------------------------------------------------------------------ */

export interface FitnessProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  /* --- demographics & anthropometry --- */
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  waistCm?: number;
  hipCm?: number;
  bodyFatPct?: number;
  /** Asian/South-Asian BMI cut-offs are lower; used for risk banding. */
  ethnicity?: "south_asian" | "east_asian" | "caucasian" | "african" | "hispanic" | "other";

  /* --- purpose --- */
  goals: GoalId[];
  /** The single most important reason the user is here. */
  primaryGoal: GoalId;
  motivation?: string;
  targetWeightKg?: number;
  targetDate?: string;

  /* --- current fitness --- */
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  experience: SkillLevel;
  restingHr?: number;
  systolicBp?: number;
  diastolicBp?: number;
  fastingGlucose?: number;
  /** Self-reported minutes of exercise in a typical week right now. */
  currentWeeklyMinutes?: number;
  canWalk30MinUnaided: boolean;
  canGetUpFromFloorUnaided: boolean;

  /* --- medical --- */
  conditions: string[];
  medications: string[];
  allergies?: string[];
  painPoints: PainPoint[];
  injuries: InjuryHistory[];
  surgeries?: string[];
  familyHistory?: string[];
  /** Free-text notes from the user or their clinician. */
  medicalNotes?: string;
  pregnancyWeeks?: number;
  postpartumWeeks?: number;
  smoker?: boolean;
  alcohol?: "none" | "occasional" | "moderate" | "heavy";
  screen: ReadinessScreen;
  hasMedicalClearance?: boolean;

  /* --- logistics & preference --- */
  environmentPreference: "indoor" | "outdoor" | "both";
  availableEquipment: Equipment[];
  daysPerWeek: number;
  minutesPerSession: number;
  preferredTime: "early_morning" | "morning" | "afternoon" | "evening" | "night" | "flexible";
  likedCategories: ActivityCategory[];
  dislikedCategories: ActivityCategory[];
  /** Apartment living, no jumping, quiet hours, etc. */
  spaceConstraint?: "tiny_room" | "room" | "hall_or_garden" | "gym" | "open_space";
  noiseConstraint?: boolean;
  climate?: "hot_humid" | "hot_dry" | "temperate" | "cold" | "monsoon" | "polluted_city";
  sleepHours?: number;
  stressLevel?: "low" | "moderate" | "high" | "severe";
  dietPattern?: "veg" | "vegan" | "eggetarian" | "non_veg" | "jain" | "keto" | "other";
  language?: string;
}

/* ------------------------------------------------------------------ *
 * Activity catalog
 * ------------------------------------------------------------------ */

export interface ActivityDefinition {
  id: string;
  name: string;
  category: ActivityCategory;
  buckets: ModalityBucket[];
  environments: Environment[];
  equipment: Equipment[];
  /** Metabolic equivalent of task — drives calorie estimates. */
  met: number;
  impact: ImpactLevel;
  jointLoad: JointLoad;
  intensity: Intensity;
  skill: SkillLevel;
  minMinutes: number;
  targetMinutes: number;
  maxMinutes: number;
  muscles: string[];
  tags: ActivityTag[];
  goodFor: GoalId[];
  howTo: string[];
  formCues: string[];
  progression: string;
  regression: string;
  /** Rain/heat/pollution can knock out outdoor options. */
  weatherDependent: boolean;
  /** Safe in a flat with neighbours below. */
  apartmentFriendly: boolean;
  spaceNeeded: "none" | "small" | "medium" | "large" | "venue";
  social: "solo" | "partner" | "group" | "any";
  benefit: string;
}

/* ------------------------------------------------------------------ *
 * Generated plan
 * ------------------------------------------------------------------ */

export type BlockRole = "warmup" | "main" | "accessory" | "cooldown" | "mindset" | "habit";

export interface PlanBlock {
  role: BlockRole;
  activityId: string;
  name: string;
  category: ActivityCategory;
  environment: Environment;
  minutes: number;
  /** Prescription: sets/reps or distance/pace, when applicable. */
  prescription?: string;
  /** Target Rate of Perceived Exertion, 1-10. */
  rpeTarget: [number, number];
  heartRateTarget?: { low: number; high: number; zone: string } | null;
  estimatedCalories: number;
  /** Condition-driven changes applied to this block. */
  modifications: string[];
  cues: string[];
  swapOptions: { id: string; name: string; environment: Environment }[];
}

export interface DailyPlan {
  /** 1-7 within the week. */
  dayIndex: number;
  weekday: string;
  date?: string;
  focus: string;
  bucket: ModalityBucket | "rest";
  isRestDay: boolean;
  totalMinutes: number;
  estimatedCalories: number;
  intensity: Intensity;
  blocks: PlanBlock[];
  /** Daily habit targets that are independent of the workout. */
  dailyTargets: {
    steps: number;
    waterMl: number;
    proteinG: number;
    sleepHours: number;
    mindfulMinutes: number;
    standBreaks: number;
  };
  notes: string[];
  motivation: string;
}

export interface PlanWeek {
  weekIndex: number;
  phase: "onboarding" | "build" | "consolidate" | "deload" | "progress";
  focus: string;
  progressionNote: string;
  targetWeeklyMinutes: number;
  days: DailyPlan[];
}

export interface DerivedMetrics {
  bmi: number;
  bmiCategory: string;
  bmiCutoffsUsed: "standard" | "south_asian";
  waistToHeight?: number;
  waistRisk?: string;
  bmr: number;
  tdee: number;
  calorieTarget: number;
  calorieDelta: number;
  proteinG: number;
  waterMl: number;
  fibreG: number;
  stepTarget: number;
  maxHr: number;
  heartRateZones: { zone: string; low: number; high: number; purpose: string }[] | null;
  heartRateReliable: boolean;
  rpeGuidance: string;
  weeklyMinutesTarget: number;
  currentWeeklyMinutes: number;
  weightChangePerWeekKg?: number;
  estimatedWeeksToTarget?: number;
  fitnessAgeNote: string;
}

export type SafetyLevel = "clear" | "caution" | "clearance_required" | "stop";

export interface SafetyReport {
  level: SafetyLevel;
  /** True when the plan must not be started until a clinician signs off. */
  blocksPlan: boolean;
  reasons: string[];
  excludedTags: ActivityTag[];
  cautionTags: ActivityTag[];
  requiredModifications: string[];
  monitoring: string[];
  redFlags: string[];
  intensityCeiling: Intensity;
  maxImpact: ImpactLevel;
  maxJointLoad: JointLoad;
  disclaimers: string[];
}

export interface FitnessPlan {
  id: string;
  profileId: string;
  profileName: string;
  createdAt: string;
  title: string;
  summary: string;
  goals: { id: GoalId; label: string; purpose: string; mechanism: string }[];
  primaryGoal: GoalId;
  metrics: DerivedMetrics;
  safety: SafetyReport;
  weeks: PlanWeek[];
  weeklySplit: { weekday: string; focus: string; minutes: number }[];
  trackedMetrics: TrackedMetric[];
  nonNegotiables: string[];
  education: { title: string; body: string }[];
  warnings: string[];
  adherenceTips: string[];
  /** Indoor fallbacks for every outdoor day, by weekday. */
  weatherFallbacks: { weekday: string; instead: string; use: string }[];
  scores: {
    safety: number;
    goalMatch: number;
    variety: number;
    feasibility: number;
    overall: number;
  };
}

/* ------------------------------------------------------------------ *
 * Tracker
 * ------------------------------------------------------------------ */

export interface CompletedActivity {
  activityId: string;
  name: string;
  category: ActivityCategory;
  environment: Environment;
  minutes: number;
  rpe?: number;
  /** Copied from the plan when the block was ticked off, else estimated. */
  caloriesEst: number;
  sets?: number;
  reps?: string;
  loadKg?: number;
  distanceKm?: number;
  painBefore?: number;
  painAfter?: number;
  notes?: string;
  planned: boolean;
}

export interface DailyLog {
  id: string;
  profileId: string;
  planId?: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  activities: CompletedActivity[];
  steps?: number;
  weightKg?: number;
  restingHr?: number;
  systolicBp?: number;
  diastolicBp?: number;
  bloodGlucose?: number;
  sleepHours?: number;
  sleepQuality?: number;
  mood?: number;
  stress?: number;
  energy?: number;
  painScore?: number;
  stiffnessMinutes?: number;
  waterMl?: number;
  proteinG?: number;
  mindfulMinutes?: number;
  /** Did the user complete the planned session? */
  adherence: "completed" | "partial" | "swapped" | "missed" | "rest";
  symptoms?: string[];
  notes?: string;
  updatedAt: string;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate?: string;
  activeDaysLast7: number;
  activeDaysLast30: number;
}

export interface WeeklyRollup {
  weekStart: string;
  activeMinutes: number;
  targetMinutes: number;
  sessions: number;
  caloriesBurned: number;
  steps: number;
  avgRpe: number | null;
  avgPain: number | null;
  avgSleep: number | null;
  avgMood: number | null;
  avgStress: number | null;
  adherencePct: number;
  byCategory: { category: ActivityCategory; minutes: number }[];
  byEnvironment: { indoor: number; outdoor: number };
  byBucket: { bucket: ModalityBucket; minutes: number }[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrackerInsight {
  level: "good" | "info" | "warn" | "risk";
  title: string;
  detail: string;
  action?: string;
}

export interface TrackerSummary {
  streak: StreakInfo;
  thisWeek: WeeklyRollup;
  lastWeek: WeeklyRollup | null;
  trends: {
    weight: TrendPoint[];
    pain: TrendPoint[];
    sleep: TrendPoint[];
    mood: TrendPoint[];
    activeMinutes: TrendPoint[];
    steps: TrendPoint[];
    rpe: TrendPoint[];
  };
  totals: { sessions: number; minutes: number; calories: number; days: number };
  insights: TrackerInsight[];
  goalProgress: { metric: TrackedMetric; label: string; current: number | null; target: number | null; unit: string; direction: "up" | "down" }[];
}
