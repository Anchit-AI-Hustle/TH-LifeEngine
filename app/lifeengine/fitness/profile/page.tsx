"use client";

/**
 * Full health profile intake.
 *
 * Seven steps: who you are, what you want, where you're starting from,
 * medical history, pain & injuries, the safety screen, and logistics.
 * Everything is optional except name, height, weight and a primary goal —
 * but the more that is filled in, the more the plan adapts.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "../Fitness.module.css";
import { Alert, Badge } from "../ui";
import { CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/lib/fitness/activities";
import { CONDITION_FAMILY_LABELS, conditionsByFamily, MEDICATION_LIST } from "@/lib/fitness/conditions";
import { GOALS, goalsByFamily } from "@/lib/fitness/goals";
import { buildFitnessPlan } from "@/lib/fitness/engine";
import { buildSafetyReport, SCREEN_QUESTIONS } from "@/lib/fitness/screening";
import { createBlankProfile, DEMO_PROFILES } from "@/lib/fitness/samples";
import {
  getActiveProfile,
  saveFitnessPlan,
  saveFitnessProfile,
  setActiveProfileId,
} from "@/lib/fitness/store";
import type {
  ActivityCategory,
  Equipment,
  FitnessProfile,
  GoalId,
  PainPoint,
  PainRegion,
} from "@/lib/fitness/types";

const STEPS = [
  { id: "about", label: "About you" },
  { id: "purpose", label: "Your purpose" },
  { id: "baseline", label: "Starting point" },
  { id: "medical", label: "Medical history" },
  { id: "pain", label: "Pain & injuries" },
  { id: "screen", label: "Safety screen" },
  { id: "logistics", label: "Time & place" },
] as const;

const PAIN_REGIONS: { id: PainRegion; label: string }[] = [
  { id: "neck", label: "Neck" },
  { id: "upper_back", label: "Upper back" },
  { id: "lower_back", label: "Lower back" },
  { id: "shoulder", label: "Shoulder" },
  { id: "elbow", label: "Elbow" },
  { id: "wrist_hand", label: "Wrist / hand" },
  { id: "hip", label: "Hip" },
  { id: "knee", label: "Knee" },
  { id: "ankle_foot", label: "Ankle / foot" },
  { id: "sacroiliac", label: "Pelvis / SI joint" },
  { id: "jaw", label: "Jaw" },
  { id: "generalised", label: "All over" },
];

const EQUIPMENT_CHOICES: Equipment[] = [
  "none",
  "mat",
  "resistance_band",
  "dumbbells",
  "kettlebell",
  "barbell",
  "chair",
  "step_platform",
  "foam_roller",
  "stability_ball",
  "jump_rope",
  "pull_up_bar",
  "bench",
  "trx",
  "boxing_bag",
  "treadmill",
  "stationary_bike",
  "rower",
  "bicycle",
  "pool",
  "racket",
  "ball",
  "props_yoga",
  "machines",
  "gym_access",
];

export default function FitnessProfilePage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<FitnessProfile>(() => {
    if (typeof window === "undefined") return createBlankProfile();
    return getActiveProfile() ?? createBlankProfile();
  });

  const set = <K extends keyof FitnessProfile>(key: K, value: FitnessProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const safetyPreview = useMemo(() => buildSafetyReport(profile), [profile]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const validate = (): string | null => {
    if (!profile.name.trim()) return "Please enter a name so you can tell profiles apart.";
    if (!profile.age || profile.age < 5 || profile.age > 110) return "Please enter an age between 5 and 110.";
    if (!profile.heightCm || profile.heightCm < 90 || profile.heightCm > 240) return "Please enter a height between 90 and 240 cm.";
    if (!profile.weightKg || profile.weightKg < 20 || profile.weightKg > 300) return "Please enter a weight between 20 and 300 kg.";
    if (!profile.goals.length) return "Pick at least one goal — the whole plan is built around your purpose.";
    return null;
  };

  const handleSave = (generate: boolean) => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const toSave: FitnessProfile = {
        ...profile,
        goals: profile.goals.length ? profile.goals : [profile.primaryGoal],
        primaryGoal: profile.goals.includes(profile.primaryGoal) ? profile.primaryGoal : profile.goals[0],
      };
      saveFitnessProfile(toSave);
      setActiveProfileId(toSave.id);
      if (generate) {
        const plan = buildFitnessPlan(toSave, { weeks: 4 });
        saveFitnessPlan(plan);
        router.push("/lifeengine/fitness/planner");
      } else {
        router.push("/lifeengine/fitness");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong saving the profile.");
    } finally {
      setSaving(false);
    }
  };

  const loadDemo = (id: string) => {
    const demo = DEMO_PROFILES.find((d) => d.id === id);
    if (demo) {
      setProfile({ ...demo, id: `fitprof_${Date.now().toString(36)}`, name: demo.name });
      setStepIndex(0);
      setError(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.stack}>
            <span className={styles.eyebrow}>Fitness &amp; health planner</span>
            <h1 className={styles.title}>Your health profile</h1>
            <p className={styles.subtitle}>
              The plan is only as good as what it knows about you. Age, sex, conditions, medications, pain and
              medical history all change what is safe and what actually works — so the more you fill in, the more
              the plan adapts. Nothing here leaves your browser.
            </p>
          </div>
          <div className={styles.stack}>
            <span className={styles.eyebrow}>Load an example</span>
            <div className={styles.chipWrap}>
              {DEMO_PROFILES.map((demo) => (
                <button key={demo.id} type="button" className={styles.chip} onClick={() => loadDemo(demo.id)}>
                  {demo.name.replace(" (demo)", "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <nav className={styles.steps} aria-label="Intake steps">
          {STEPS.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              className={`${styles.stepButton} ${index === stepIndex ? styles.stepButtonActive : ""} ${
                index < stepIndex ? styles.stepButtonDone : ""
              }`}
              onClick={() => setStepIndex(index)}
              aria-current={index === stepIndex ? "step" : undefined}
            >
              <span className={styles.stepIndex}>{index + 1}</span>
              {entry.label}
            </button>
          ))}
        </nav>
      </header>

      {error ? (
        <Alert tone="risk" title="Check this before continuing">
          {error}
        </Alert>
      ) : null}

      {/* ---------------- 1. About you ---------------- */}
      {step.id === "about" ? (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>About you</h2>
          <div className={`${styles.grid} ${styles.grid3}`}>
            <label className={styles.field}>
              <span className={styles.label}>Name *</span>
              <input
                className={styles.control}
                value={profile.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="e.g. Ritika"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Age *</span>
              <input
                className={styles.control}
                type="number"
                min={5}
                max={110}
                value={profile.age}
                onChange={(event) => set("age", Number(event.target.value))}
              />
              <span className={styles.help}>Sets your heart-rate ranges and how fast the plan progresses.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Sex</span>
              <select
                className={styles.control}
                value={profile.sex}
                onChange={(event) => set("sex", event.target.value as FitnessProfile["sex"])}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other / prefer not to say</option>
              </select>
              <span className={styles.help}>Used for the metabolic-rate equation, nothing else.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Height (cm) *</span>
              <input
                className={styles.control}
                type="number"
                min={90}
                max={240}
                value={profile.heightCm}
                onChange={(event) => set("heightCm", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Weight (kg) *</span>
              <input
                className={styles.control}
                type="number"
                min={20}
                max={300}
                step={0.1}
                value={profile.weightKg}
                onChange={(event) => set("weightKg", Number(event.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Waist (cm)</span>
              <input
                className={styles.control}
                type="number"
                min={40}
                max={200}
                value={profile.waistCm ?? ""}
                onChange={(event) => set("waistCm", event.target.value ? Number(event.target.value) : undefined)}
                placeholder="Optional"
              />
              <span className={styles.help}>
                Waist-to-height ratio predicts metabolic risk better than BMI. Measure at the navel, breathing out.
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Body fat %</span>
              <input
                className={styles.control}
                type="number"
                min={3}
                max={70}
                value={profile.bodyFatPct ?? ""}
                onChange={(event) => set("bodyFatPct", event.target.value ? Number(event.target.value) : undefined)}
                placeholder="Optional"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Ethnicity</span>
              <select
                className={styles.control}
                value={profile.ethnicity ?? "other"}
                onChange={(event) => set("ethnicity", event.target.value as FitnessProfile["ethnicity"])}
              >
                <option value="south_asian">South Asian</option>
                <option value="east_asian">East Asian</option>
                <option value="caucasian">Caucasian</option>
                <option value="african">African</option>
                <option value="hispanic">Hispanic</option>
                <option value="other">Other / prefer not to say</option>
              </select>
              <span className={styles.help}>
                South and East Asian populations carry metabolic risk at a lower BMI, so the healthy-weight
                thresholds shift down.
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Target weight (kg)</span>
              <input
                className={styles.control}
                type="number"
                min={20}
                max={300}
                step={0.1}
                value={profile.targetWeightKg ?? ""}
                onChange={(event) => set("targetWeightKg", event.target.value ? Number(event.target.value) : undefined)}
                placeholder="Optional"
              />
            </label>
          </div>
        </section>
      ) : null}

      {/* ---------------- 2. Purpose ---------------- */}
      {step.id === "purpose" ? (
        <section className={styles.stack}>
          <div className={styles.panel}>
            <h2 className={styles.sectionTitle}>Why are you here?</h2>
            <p className={styles.muted}>
              Pick everything that applies, then set one as your main goal. Your main goal decides the shape of the
              week; the others adjust it. This is the single biggest input into the plan — &ldquo;lose weight&rdquo;
              and &ldquo;reduce joint pain&rdquo; produce genuinely different weeks, not the same week with a
              different title.
            </p>
            {profile.goals.length ? (
              <div className={styles.row}>
                <span className={styles.eyebrow}>Main goal</span>
                <select
                  className={styles.control}
                  style={{ maxWidth: 320 }}
                  value={profile.primaryGoal}
                  onChange={(event) => set("primaryGoal", event.target.value as GoalId)}
                >
                  {profile.goals.map((goal) => (
                    <option key={goal} value={goal}>
                      {GOALS[goal]?.label ?? goal}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className={styles.field}>
              <span className={styles.label}>What would success look like for you?</span>
              <textarea
                className={styles.control}
                rows={2}
                value={profile.motivation ?? ""}
                onChange={(event) => set("motivation", event.target.value)}
                placeholder="e.g. Climb three flights of stairs without my knees hurting"
              />
            </label>
          </div>

          {goalsByFamily().map((family) => (
            <div key={family.family} className={styles.panel}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                {family.label}
              </h3>
              <div className={`${styles.grid} ${styles.grid2}`}>
                {family.goals.map((goal) => {
                  const selected = profile.goals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      className={`${styles.optionCard} ${selected ? styles.optionCardActive : ""}`}
                      onClick={() => {
                        const next = toggleIn(profile.goals, goal.id);
                        setProfile((current) => ({
                          ...current,
                          goals: next,
                          primaryGoal: next.includes(current.primaryGoal) ? current.primaryGoal : next[0] ?? goal.id,
                        }));
                      }}
                      aria-pressed={selected}
                    >
                      {profile.primaryGoal === goal.id && selected ? (
                        <span className={styles.primaryFlag}>Main goal</span>
                      ) : null}
                      <span className={styles.optionLabel}>{goal.label}</span>
                      <span className={styles.optionMeta}>{goal.purpose}</span>
                      <span className={styles.tiny}>Typical timeline: {goal.expectedTimeline}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* ---------------- 3. Baseline ---------------- */}
      {step.id === "baseline" ? (
        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Where you are starting from</h2>
          <p className={styles.muted}>
            Be honest rather than aspirational here. Starting below your capacity is how the plan survives past week
            two; starting above it is how people quit.
          </p>
          <div className={`${styles.grid} ${styles.grid3}`}>
            <label className={styles.field}>
              <span className={styles.label}>Current activity level</span>
              <select
                className={styles.control}
                value={profile.activityLevel}
                onChange={(event) => set("activityLevel", event.target.value as FitnessProfile["activityLevel"])}
              >
                <option value="sedentary">Sedentary — desk job, little movement</option>
                <option value="light">Lightly active — some walking</option>
                <option value="moderate">Moderately active — exercise 3x a week</option>
                <option value="active">Active — exercise most days</option>
                <option value="very_active">Very active — daily training or physical job</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Exercise experience</span>
              <select
                className={styles.control}
                value={profile.experience}
                onChange={(event) => set("experience", event.target.value as FitnessProfile["experience"])}
              >
                <option value="beginner">Beginner — new or returning after a long break</option>
                <option value="intermediate">Intermediate — comfortable with the basics</option>
                <option value="advanced">Advanced — years of consistent training</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Exercise minutes in a typical week now</span>
              <input
                className={styles.control}
                type="number"
                min={0}
                max={1200}
                value={profile.currentWeeklyMinutes ?? ""}
                onChange={(event) =>
                  set("currentWeeklyMinutes", event.target.value ? Number(event.target.value) : undefined)
                }
                placeholder="e.g. 90"
              />
              <span className={styles.help}>The plan starts near this number and builds from it.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Resting heart rate (bpm)</span>
              <input
                className={styles.control}
                type="number"
                min={35}
                max={130}
                value={profile.restingHr ?? ""}
                onChange={(event) => set("restingHr", event.target.value ? Number(event.target.value) : undefined)}
                placeholder="Measured on waking"
              />
              <span className={styles.help}>Lets your heart-rate zones be personalised instead of estimated.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Blood pressure (systolic / diastolic)</span>
              <span className={styles.row}>
                <input
                  className={styles.control}
                  type="number"
                  min={70}
                  max={250}
                  style={{ maxWidth: 90 }}
                  value={profile.systolicBp ?? ""}
                  onChange={(event) => set("systolicBp", event.target.value ? Number(event.target.value) : undefined)}
                  placeholder="120"
                  aria-label="Systolic blood pressure"
                />
                <span aria-hidden="true">/</span>
                <input
                  className={styles.control}
                  type="number"
                  min={40}
                  max={160}
                  style={{ maxWidth: 90 }}
                  value={profile.diastolicBp ?? ""}
                  onChange={(event) => set("diastolicBp", event.target.value ? Number(event.target.value) : undefined)}
                  placeholder="80"
                  aria-label="Diastolic blood pressure"
                />
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Fasting glucose (mg/dL)</span>
              <input
                className={styles.control}
                type="number"
                min={40}
                max={500}
                value={profile.fastingGlucose ?? ""}
                onChange={(event) =>
                  set("fastingGlucose", event.target.value ? Number(event.target.value) : undefined)
                }
                placeholder="Optional"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Usual sleep (hours)</span>
              <input
                className={styles.control}
                type="number"
                min={3}
                max={12}
                step={0.5}
                value={profile.sleepHours ?? ""}
                onChange={(event) => set("sleepHours", event.target.value ? Number(event.target.value) : undefined)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Stress level</span>
              <select
                className={styles.control}
                value={profile.stressLevel ?? "moderate"}
                onChange={(event) => set("stressLevel", event.target.value as FitnessProfile["stressLevel"])}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="severe">Severe — it is affecting daily life</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Diet pattern</span>
              <select
                className={styles.control}
                value={profile.dietPattern ?? "other"}
                onChange={(event) => set("dietPattern", event.target.value as FitnessProfile["dietPattern"])}
              >
                <option value="veg">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="eggetarian">Eggetarian</option>
                <option value="non_veg">Non-vegetarian</option>
                <option value="jain">Jain</option>
                <option value="keto">Keto / low carb</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <hr className={styles.divider} />
          <span className={styles.eyebrow}>Functional capacity</span>
          <div className={`${styles.grid} ${styles.grid2}`}>
            <div className={styles.toggleRow}>
              <input
                id="walk30"
                type="checkbox"
                checked={profile.canWalk30MinUnaided}
                onChange={(event) => set("canWalk30MinUnaided", event.target.checked)}
              />
              <label htmlFor="walk30">
                I can walk for 30 minutes without stopping or needing support
                <br />
                <span className={styles.tiny}>If not, sessions are split into shorter bouts.</span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <input
                id="floor"
                type="checkbox"
                checked={profile.canGetUpFromFloorUnaided}
                onChange={(event) => set("canGetUpFromFloorUnaided", event.target.checked)}
              />
              <label htmlFor="floor">
                I can get down to the floor and back up unaided
                <br />
                <span className={styles.tiny}>If not, floor exercises are replaced with seated and standing versions.</span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <input
                id="smoker"
                type="checkbox"
                checked={profile.smoker ?? false}
                onChange={(event) => set("smoker", event.target.checked)}
              />
              <label htmlFor="smoker">I smoke or vape</label>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>Alcohol</span>
              <select
                className={styles.control}
                value={profile.alcohol ?? "none"}
                onChange={(event) => set("alcohol", event.target.value as FitnessProfile["alcohol"])}
              >
                <option value="none">None</option>
                <option value="occasional">Occasional</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {/* ---------------- 4. Medical ---------------- */}
      {step.id === "medical" ? (
        <section className={styles.stack}>
          <div className={styles.panel}>
            <h2 className={styles.sectionTitle}>Medical history</h2>
            <p className={styles.muted}>
              Select every condition that applies. Each one adds real constraints: movements that get excluded, an
              intensity ceiling, specific modifications and the warning signs to watch for. This is what separates a
              plan built for you from a generic one.
            </p>
            {profile.conditions.length ? (
              <div className={styles.row}>
                <Badge tone="info">{profile.conditions.length} selected</Badge>
                {safetyPreview.excludedTags.length ? (
                  <Badge tone="warn">{safetyPreview.excludedTags.length} movement patterns will be excluded</Badge>
                ) : null}
                <Badge tone={safetyPreview.level === "clearance_required" ? "risk" : "neutral"}>
                  Intensity ceiling: {safetyPreview.intensityCeiling.replace(/_/g, " ")}
                </Badge>
              </div>
            ) : null}
          </div>

          {conditionsByFamily().map((family) => (
            <div key={family.family} className={styles.panel}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                {CONDITION_FAMILY_LABELS[family.family] ?? family.label}
              </h3>
              <div className={`${styles.grid} ${styles.grid2}`}>
                {family.conditions.map((condition) => {
                  const selected = profile.conditions.includes(condition.id);
                  return (
                    <button
                      key={condition.id}
                      type="button"
                      className={`${styles.optionCard} ${selected ? styles.optionCardActive : ""}`}
                      onClick={() => set("conditions", toggleIn(profile.conditions, condition.id))}
                      aria-pressed={selected}
                    >
                      <span className={styles.optionLabel}>
                        {condition.label}
                        {condition.clearanceRequired ? " ·  needs clearance" : ""}
                      </span>
                      <span className={styles.optionMeta}>{condition.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className={styles.panel}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
              Medications
            </h3>
            <p className={styles.muted}>
              Medication changes how your body responds to exercise. Beta blockers make heart-rate targets
              meaningless, insulin creates hypoglycaemia risk, blood thinners rule out contact sports.
            </p>
            <div className={`${styles.grid} ${styles.grid2}`}>
              {MEDICATION_LIST.map((med) => {
                const selected = profile.medications.includes(med.id);
                return (
                  <button
                    key={med.id}
                    type="button"
                    className={`${styles.optionCard} ${selected ? styles.optionCardActive : ""}`}
                    onClick={() => set("medications", toggleIn(profile.medications, med.id))}
                    aria-pressed={selected}
                  >
                    <span className={styles.optionLabel}>{med.label}</span>
                    <span className={styles.optionMeta}>e.g. {med.examples.join(", ")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.panel}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
              Life stage & other details
            </h3>
            <div className={`${styles.grid} ${styles.grid3}`}>
              <label className={styles.field}>
                <span className={styles.label}>Pregnant — weeks</span>
                <input
                  className={styles.control}
                  type="number"
                  min={0}
                  max={45}
                  value={profile.pregnancyWeeks ?? ""}
                  onChange={(event) =>
                    set("pregnancyWeeks", event.target.value ? Number(event.target.value) : undefined)
                  }
                  placeholder="Leave blank if not"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Postpartum — weeks since birth</span>
                <input
                  className={styles.control}
                  type="number"
                  min={0}
                  max={104}
                  value={profile.postpartumWeeks ?? ""}
                  onChange={(event) =>
                    set("postpartumWeeks", event.target.value ? Number(event.target.value) : undefined)
                  }
                  placeholder="Leave blank if not"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Allergies</span>
                <input
                  className={styles.control}
                  value={(profile.allergies ?? []).join(", ")}
                  onChange={(event) =>
                    set("allergies", event.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                  }
                  placeholder="Comma separated"
                />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>Past surgeries</span>
              <input
                className={styles.control}
                value={(profile.surgeries ?? []).join(", ")}
                onChange={(event) =>
                  set("surgeries", event.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                }
                placeholder="e.g. Knee arthroscopy 2019, Caesarean 2022"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Family history</span>
              <input
                className={styles.control}
                value={(profile.familyHistory ?? []).join(", ")}
                onChange={(event) =>
                  set("familyHistory", event.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                }
                placeholder="e.g. Diabetes (father), heart disease (mother)"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Anything else we should know</span>
              <textarea
                className={styles.control}
                rows={3}
                value={profile.medicalNotes ?? ""}
                onChange={(event) => set("medicalNotes", event.target.value)}
                placeholder="Notes from your doctor or physiotherapist, restrictions you have been given, anything that changes what is safe."
              />
            </label>
          </div>
        </section>
      ) : null}

      {/* ---------------- 5. Pain & injuries ---------------- */}
      {step.id === "pain" ? (
        <section className={styles.stack}>
          <div className={styles.panel}>
            <h2 className={styles.sectionTitle}>Where does it hurt?</h2>
            <p className={styles.muted}>
              Tap a region to add it, then rate the pain from 0 to 10. Pain of 5 or more removes impact and heavy
              loading from that area; chronic pain switches the plan to graded exposure, which is the approach with
              the best evidence behind it.
            </p>
            <div className={styles.chipWrap}>
              {PAIN_REGIONS.map((region) => {
                const existing = profile.painPoints.find((p) => p.region === region.id);
                return (
                  <button
                    key={region.id}
                    type="button"
                    className={`${styles.chip} ${existing ? styles.chipActive : ""}`}
                    onClick={() => {
                      if (existing) {
                        set("painPoints", profile.painPoints.filter((p) => p.region !== region.id));
                      } else {
                        set("painPoints", [
                          ...profile.painPoints,
                          { region: region.id, severity: 4, chronic: false } satisfies PainPoint,
                        ]);
                      }
                    }}
                    aria-pressed={Boolean(existing)}
                  >
                    {region.label}
                    {existing ? ` · ${existing.severity}/10` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {profile.painPoints.map((pain, index) => (
            <div key={pain.region} className={styles.panel}>
              <div className={styles.spread}>
                <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                  {PAIN_REGIONS.find((r) => r.id === pain.region)?.label ?? pain.region}
                </h3>
                <button
                  type="button"
                  className="btn subtle sm"
                  onClick={() => set("painPoints", profile.painPoints.filter((p) => p.region !== pain.region))}
                >
                  Remove
                </button>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>
                  Pain right now: {pain.severity}/10{" "}
                  <span className={styles.tiny}>
                    {pain.severity <= 3 ? "mild" : pain.severity <= 6 ? "moderate" : "severe"}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={pain.severity}
                  onChange={(event) => {
                    const next = [...profile.painPoints];
                    next[index] = { ...pain, severity: Number(event.target.value) };
                    set("painPoints", next);
                  }}
                />
              </label>
              <div className={`${styles.grid} ${styles.grid2}`}>
                <div className={styles.toggleRow}>
                  <input
                    id={`chronic-${pain.region}`}
                    type="checkbox"
                    checked={pain.chronic}
                    onChange={(event) => {
                      const next = [...profile.painPoints];
                      next[index] = { ...pain, chronic: event.target.checked };
                      set("painPoints", next);
                    }}
                  />
                  <label htmlFor={`chronic-${pain.region}`}>
                    It has lasted more than three months
                    <br />
                    <span className={styles.tiny}>Chronic pain responds to graded loading, not rest.</span>
                  </label>
                </div>
                <div className={styles.toggleRow}>
                  <input
                    id={`flare-${pain.region}`}
                    type="checkbox"
                    checked={pain.flareUp ?? false}
                    onChange={(event) => {
                      const next = [...profile.painPoints];
                      next[index] = { ...pain, flareUp: event.target.checked };
                      set("painPoints", next);
                    }}
                  />
                  <label htmlFor={`flare-${pain.region}`}>
                    It is flared up right now
                    <br />
                    <span className={styles.tiny}>Drops intensity and shortens sessions until it settles.</span>
                  </label>
                </div>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>What makes it worse?</span>
                <input
                  className={styles.control}
                  value={pain.triggers ?? ""}
                  onChange={(event) => {
                    const next = [...profile.painPoints];
                    next[index] = { ...pain, triggers: event.target.value };
                    set("painPoints", next);
                  }}
                  placeholder="e.g. Stairs, sitting for long periods, first thing in the morning"
                />
              </label>
            </div>
          ))}

          <div className={styles.panel}>
            <div className={styles.spread}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                Injuries &amp; surgeries
              </h3>
              <button
                type="button"
                className="btn subtle sm"
                onClick={() =>
                  set("injuries", [
                    ...profile.injuries,
                    { description: "", region: "knee", monthsAgo: 6, surgical: false, clearedByClinician: false },
                  ])
                }
              >
                + Add injury
              </button>
            </div>
            {profile.injuries.length === 0 ? (
              <p className={styles.muted}>None recorded. Add anything from the last couple of years that still affects you.</p>
            ) : null}
            {profile.injuries.map((injury, index) => (
              <div key={index} className={styles.panelTight} style={{ border: "1px solid var(--border)", borderRadius: 10 }}>
                <div className={`${styles.grid} ${styles.grid3}`}>
                  <label className={styles.field}>
                    <span className={styles.label}>What happened</span>
                    <input
                      className={styles.control}
                      value={injury.description}
                      onChange={(event) => {
                        const next = [...profile.injuries];
                        next[index] = { ...injury, description: event.target.value };
                        set("injuries", next);
                      }}
                      placeholder="e.g. ACL reconstruction"
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Area</span>
                    <select
                      className={styles.control}
                      value={injury.region}
                      onChange={(event) => {
                        const next = [...profile.injuries];
                        next[index] = { ...injury, region: event.target.value as PainRegion };
                        set("injuries", next);
                      }}
                    >
                      {PAIN_REGIONS.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.label}
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Months ago</span>
                    <input
                      className={styles.control}
                      type="number"
                      min={0}
                      max={600}
                      value={injury.monthsAgo}
                      onChange={(event) => {
                        const next = [...profile.injuries];
                        next[index] = { ...injury, monthsAgo: Number(event.target.value) };
                        set("injuries", next);
                      }}
                    />
                  </label>
                </div>
                <div className={styles.row}>
                  <label className={styles.row} style={{ gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={injury.surgical}
                      onChange={(event) => {
                        const next = [...profile.injuries];
                        next[index] = { ...injury, surgical: event.target.checked };
                        set("injuries", next);
                      }}
                    />
                    <span className={styles.tiny}>Needed surgery</span>
                  </label>
                  <label className={styles.row} style={{ gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={injury.clearedByClinician}
                      onChange={(event) => {
                        const next = [...profile.injuries];
                        next[index] = { ...injury, clearedByClinician: event.target.checked };
                        set("injuries", next);
                      }}
                    />
                    <span className={styles.tiny}>Cleared by a clinician</span>
                  </label>
                  <button
                    type="button"
                    className={`btn subtle sm ${styles.right}`}
                    onClick={() => set("injuries", profile.injuries.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------- 6. Safety screen ---------------- */}
      {step.id === "screen" ? (
        <section className={styles.stack}>
          <div className={styles.panel}>
            <h2 className={styles.sectionTitle}>Safety screen</h2>
            <p className={styles.muted}>
              These are the standard pre-exercise screening questions. Answering yes to any of them does not stop you
              exercising — it changes what the plan prescribes, and for some answers it means getting a doctor&rsquo;s
              sign-off first. Answer honestly; the plan is only as safe as this section.
            </p>
            {SCREEN_QUESTIONS.map((item) => (
              <div key={item.key} className={styles.toggleRow}>
                <input
                  id={`screen-${item.key}`}
                  type="checkbox"
                  checked={profile.screen[item.key]}
                  onChange={(event) => set("screen", { ...profile.screen, [item.key]: event.target.checked })}
                />
                <label htmlFor={`screen-${item.key}`}>{item.question}</label>
              </div>
            ))}
            <div className={styles.toggleRow}>
              <input
                id="cleared"
                type="checkbox"
                checked={profile.hasMedicalClearance ?? false}
                onChange={(event) => set("hasMedicalClearance", event.target.checked)}
              />
              <label htmlFor="cleared">
                A doctor has already cleared me to exercise
                <br />
                <span className={styles.tiny}>
                  Tick this only if you genuinely have that clearance. It relaxes the &ldquo;get cleared first&rdquo;
                  gate but keeps every other safety constraint in place.
                </span>
              </label>
            </div>
          </div>

          <div className={styles.panel}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
              What your answers mean so far
            </h3>
            {safetyPreview.level === "stop" ? (
              <Alert tone="risk" title="Get assessed before you start">
                <ul>
                  {safetyPreview.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </Alert>
            ) : safetyPreview.level === "clearance_required" ? (
              <Alert tone="warn" title="Medical clearance recommended first">
                <ul>
                  {safetyPreview.reasons.slice(0, 6).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <span>The plan will still be generated so you can take it to your clinician and discuss it.</span>
              </Alert>
            ) : safetyPreview.level === "caution" ? (
              <Alert tone="info" title="Plan will be adapted to your profile">
                {safetyPreview.excludedTags.length} movement pattern(s) excluded, intensity capped at{" "}
                {safetyPreview.intensityCeiling.replace(/_/g, " ")}, impact capped at {safetyPreview.maxImpact}.
              </Alert>
            ) : (
              <Alert tone="good" title="No red flags from your answers">
                You are clear to start. The plan will still progress gradually — that is how it stays sustainable.
              </Alert>
            )}

            {safetyPreview.requiredModifications.length ? (
              <>
                <span className={styles.eyebrow}>Modifications that will be applied</span>
                <ul className={styles.blockList}>
                  {safetyPreview.requiredModifications.slice(0, 10).map((mod) => (
                    <li key={mod}>{mod}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ---------------- 7. Logistics ---------------- */}
      {step.id === "logistics" ? (
        <section className={styles.stack}>
          <div className={styles.panel}>
            <h2 className={styles.sectionTitle}>Time, place &amp; preference</h2>
            <div className={`${styles.grid} ${styles.grid3}`}>
              <label className={styles.field}>
                <span className={styles.label}>Indoor or outdoor?</span>
                <select
                  className={styles.control}
                  value={profile.environmentPreference}
                  onChange={(event) =>
                    set("environmentPreference", event.target.value as FitnessProfile["environmentPreference"])
                  }
                >
                  <option value="both">Both — mix it up</option>
                  <option value="indoor">Indoor only</option>
                  <option value="outdoor">Outdoor only</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Days per week</span>
                <input
                  className={styles.control}
                  type="number"
                  min={1}
                  max={7}
                  value={profile.daysPerWeek}
                  onChange={(event) => set("daysPerWeek", Number(event.target.value))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Minutes per session</span>
                <input
                  className={styles.control}
                  type="number"
                  min={10}
                  max={150}
                  step={5}
                  value={profile.minutesPerSession}
                  onChange={(event) => set("minutesPerSession", Number(event.target.value))}
                />
                <span className={styles.help}>A realistic number you can hit on a bad week, not your best week.</span>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Preferred time of day</span>
                <select
                  className={styles.control}
                  value={profile.preferredTime}
                  onChange={(event) => set("preferredTime", event.target.value as FitnessProfile["preferredTime"])}
                >
                  <option value="early_morning">Early morning (before 7am)</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Space available</span>
                <select
                  className={styles.control}
                  value={profile.spaceConstraint ?? "room"}
                  onChange={(event) => set("spaceConstraint", event.target.value as FitnessProfile["spaceConstraint"])}
                >
                  <option value="tiny_room">Tiny — just a mat&rsquo;s worth</option>
                  <option value="room">A room</option>
                  <option value="hall_or_garden">Hall, terrace or garden</option>
                  <option value="gym">Gym</option>
                  <option value="open_space">Open space or park nearby</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Climate</span>
                <select
                  className={styles.control}
                  value={profile.climate ?? "temperate"}
                  onChange={(event) => set("climate", event.target.value as FitnessProfile["climate"])}
                >
                  <option value="hot_humid">Hot and humid</option>
                  <option value="hot_dry">Hot and dry</option>
                  <option value="temperate">Temperate</option>
                  <option value="cold">Cold</option>
                  <option value="monsoon">Monsoon / heavy rain</option>
                  <option value="polluted_city">Polluted city</option>
                </select>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <input
                id="noise"
                type="checkbox"
                checked={profile.noiseConstraint ?? false}
                onChange={(event) => set("noiseConstraint", event.target.checked)}
              />
              <label htmlFor="noise">
                I need to keep it quiet (flat, neighbours below, shared walls)
                <br />
                <span className={styles.tiny}>Removes jumping and other impact from the plan entirely.</span>
              </label>
            </div>
          </div>

          <div className={styles.panel}>
            <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
              Equipment you can actually get to
            </h3>
            <p className={styles.muted}>
              Only tick what you have access to. The planner will not prescribe anything you cannot do — but
              a mat and one resistance band unlock a large part of the library.
            </p>
            <div className={styles.chipWrap}>
              {EQUIPMENT_CHOICES.map((item) => {
                const selected = profile.availableEquipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.chip} ${selected ? styles.chipActive : ""}`}
                    onClick={() => set("availableEquipment", toggleIn(profile.availableEquipment, item))}
                    aria-pressed={selected}
                  >
                    {EQUIPMENT_LABELS[item] ?? item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.grid} ${styles.grid2}`}>
            <div className={styles.panel}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                Activities you enjoy
              </h3>
              <p className={styles.tiny}>These get scored higher. Enjoyment is the strongest predictor of sticking with a plan.</p>
              <div className={styles.chipWrap}>
                {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((category) => {
                  const selected = profile.likedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`${styles.chip} ${selected ? styles.chipActive : ""}`}
                      onClick={() => set("likedCategories", toggleIn(profile.likedCategories, category))}
                      aria-pressed={selected}
                    >
                      {CATEGORY_LABELS[category]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.panel}>
              <h3 className={styles.sectionTitle} style={{ fontSize: 15 }}>
                Activities to leave out
              </h3>
              <p className={styles.tiny}>These are excluded completely. Be selective — ruling out too much narrows the plan.</p>
              <div className={styles.chipWrap}>
                {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((category) => {
                  const selected = profile.dislikedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`${styles.chip} ${styles.chipDanger} ${selected ? styles.chipActive : ""}`}
                      onClick={() => set("dislikedCategories", toggleIn(profile.dislikedCategories, category))}
                      aria-pressed={selected}
                    >
                      {CATEGORY_LABELS[category]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------- footer nav ---------------- */}
      <footer className={styles.panel}>
        <div className={styles.spread}>
          <div className={styles.row}>
            <button
              type="button"
              className="btn subtle"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              ← Back
            </button>
            {!isLast ? (
              <button type="button" className="btn" onClick={() => setStepIndex((index) => index + 1)}>
                Next: {STEPS[stepIndex + 1].label} →
              </button>
            ) : null}
          </div>
          <div className={styles.row}>
            <Link className="btn subtle" href="/lifeengine/fitness">
              Cancel
            </Link>
            <button type="button" className="btn ghost" disabled={saving} onClick={() => handleSave(false)}>
              Save profile
            </button>
            <button type="button" className="btn" disabled={saving} onClick={() => handleSave(true)}>
              {saving ? "Building…" : "Save & build my plan"}
            </button>
          </div>
        </div>
        <p className={styles.tiny}>
          Step {stepIndex + 1} of {STEPS.length}. You can save at any point and come back — nothing is lost, and
          everything stays in this browser.
        </p>
      </footer>
    </div>
  );
}
