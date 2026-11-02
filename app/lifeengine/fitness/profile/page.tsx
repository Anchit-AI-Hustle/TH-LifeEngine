"use client";

/**
 * Fitness health profile intake.
 *
 * New profiles start from a person already saved in Profiles (prefilled) or
 * from scratch. Seven steps: about you, purpose, starting point, medical
 * history, pain and injuries, the safety screen, and time and place.
 */

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { Alert, Badge, Card, PageSkeleton, SectionHeading, ToggleChip } from "../ui";
import { ProfileSourcePicker, possessive } from "@/components/lifeengine/fitness/ProfileSourcePicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { CATEGORY_LABELS, EQUIPMENT_LABELS } from "@/lib/fitness/activities";
import { CONDITION_FAMILY_LABELS, conditionsByFamily, MEDICATION_LIST } from "@/lib/fitness/conditions";
import { buildFitnessPlan } from "@/lib/fitness/engine";
import { fitnessProfileFromPerson, type PersonProfile } from "@/lib/fitness/fromProfile";
import { GOALS, goalsByFamily } from "@/lib/fitness/goals";
import { createBlankProfile, DEMO_PROFILES } from "@/lib/fitness/samples";
import { buildSafetyReport, SCREEN_QUESTIONS } from "@/lib/fitness/screening";
import {
  getActiveProfile,
  getFitnessProfileForSource,
  saveFitnessPlan,
  saveFitnessProfile,
  setActiveProfileId,
} from "@/lib/fitness/store";
import type { ActivityCategory, Equipment, FitnessProfile, GoalId, PainPoint, PainRegion } from "@/lib/fitness/types";

const STEPS = [
  { id: "about", label: "About you" },
  { id: "purpose", label: "Goals" },
  { id: "baseline", label: "Starting point" },
  { id: "medical", label: "Medical history" },
  { id: "pain", label: "Pain and injuries" },
  { id: "screen", label: "Safety screen" },
  { id: "logistics", label: "Time and place" },
] as const;

const PAIN_REGIONS: { id: PainRegion; label: string }[] = [
  { id: "neck", label: "Neck" },
  { id: "upper_back", label: "Upper back" },
  { id: "lower_back", label: "Lower back" },
  { id: "shoulder", label: "Shoulder" },
  { id: "elbow", label: "Elbow" },
  { id: "wrist_hand", label: "Wrist or hand" },
  { id: "hip", label: "Hip" },
  { id: "knee", label: "Knee" },
  { id: "ankle_foot", label: "Ankle or foot" },
  { id: "sacroiliac", label: "Pelvis or SI joint" },
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

type Errors = Partial<Record<"name" | "age" | "heightCm" | "weightKg" | "goals", string>>;

function validateAbout(p: FitnessProfile): Errors {
  const errors: Errors = {};
  if (!p.name.trim()) errors.name = "Enter a name so you can tell people apart.";
  if (!p.age || p.age < 5 || p.age > 110) errors.age = "Enter an age between 5 and 110.";
  if (!p.heightCm || p.heightCm < 90 || p.heightCm > 240) errors.heightCm = "Enter a height between 90 and 240 cm.";
  if (!p.weightKg || p.weightKg < 20 || p.weightKg > 300) errors.weightKg = "Enter a weight between 20 and 300 kg.";
  return errors;
}

function validateGoals(p: FitnessProfile): Errors {
  return p.goals.length ? {} : { goals: "Pick at least one goal. The plan is built around it." };
}

const toggleIn = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
const numOrUndefined = (value: string) => (value === "" ? undefined : Number(value));

/* ---------------- small building blocks ---------------- */

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
        checked ? "border-indigo-200 bg-indigo-50/60" : "border-gray-200 bg-white hover:bg-gray-50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-indigo-600"
      />
      <span className="min-w-0">
        <span className="block text-gray-800">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-gray-500">{hint}</span> : null}
      </span>
    </label>
  );
}

function OptionCard({
  selected,
  onClick,
  label,
  meta,
  flag,
}: {
  selected: boolean;
  onClick: () => void;
  label: ReactNode;
  meta?: ReactNode;
  flag?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        "flex min-h-[56px] w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
        selected ? "border-indigo-300 bg-indigo-50/60" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
          {label}
          {flag}
        </span>
        {meta ? <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500">{meta}</span> : null}
      </span>
      <span
        className={clsx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 bg-white",
        )}
        aria-hidden
      >
        {selected ? <Check className="h-3 w-3" /> : null}
      </span>
    </button>
  );
}

function Group({ title, count, defaultOpen, children }: { title: string; count: number; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      className="group rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {count ? <Badge tone="info">{count} selected</Badge> : null}
          <ChevronDown className={clsx("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} aria-hidden />
        </span>
      </summary>
      <div className="grid gap-2 border-t border-gray-100 p-4 sm:grid-cols-2 sm:p-5">{children}</div>
    </details>
  );
}

/* ---------------- page ---------------- */

export default function FitnessProfilePage() {
  const router = useRouter();
  const [stage, setStage] = useState<"loading" | "pick" | "form">("loading");
  const [profile, setProfile] = useState<FitnessProfile>(() => createBlankProfile());
  const [isNew, setIsNew] = useState(true);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startFrom = (person: PersonProfile) => {
    const existing = getFitnessProfileForSource(person.id);
    if (existing) {
      setProfile(existing);
      setIsNew(false);
      setSourceName(null);
    } else {
      setProfile(fitnessProfileFromPerson(person));
      setIsNew(true);
      setSourceName(person.name?.trim() || "this person");
    }
    setStepIndex(0);
    setErrors({});
    setStage("form");
  };

  const startBlank = () => {
    setProfile(createBlankProfile());
    setIsNew(true);
    setSourceName(null);
    setStepIndex(0);
    setErrors({});
    setStage("form");
  };

  const loadDemo = (id: string) => {
    const demo = DEMO_PROFILES.find((d) => d.id === id);
    if (!demo) return;
    setProfile({ ...demo, id: `fitprof_${Date.now().toString(36)}` });
    setIsNew(true);
    setSourceName(null);
    setStepIndex(0);
    setErrors({});
    setStage("form");
  };

  // Decide what to show from the URL: ?from=<profile id>, ?new=1, or the active profile.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from) {
      (async () => {
        try {
          const response = await fetch("/api/lifeengine/profiles");
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = (await response.json()) as { profiles?: PersonProfile[] };
          const person = data.profiles?.find((p) => p.id === from);
          if (person) startFrom(person);
          else setStage("pick");
        } catch {
          setStage("pick");
        }
      })();
      return;
    }
    const active = params.get("new") ? undefined : getActiveProfile();
    if (active) {
      setProfile(active);
      setIsNew(false);
      setStage("form");
    } else {
      setStage("pick");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const set = <K extends keyof FitnessProfile>(key: K, value: FitnessProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const safetyPreview = useMemo(() => buildSafetyReport(profile), [profile]);

  if (stage === "loading") return <PageSkeleton />;

  if (stage === "pick") {
    return (
      <div>
        <PageHeader title="New fitness profile" description="Choose who this is for. You can change any detail on the next screens." />
        <ProfileSourcePicker
          title="Who is this for?"
          onPick={startFrom}
          onScratch={startBlank}
          footer={
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Or try an example</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {DEMO_PROFILES.map((demo) => (
                  <Button key={demo.id} variant="subtle" size="sm" onClick={() => loadDemo(demo.id)}>
                    {demo.name.replace(" (demo)", "").replace(" — ", ", ")}
                  </Button>
                ))}
              </div>
            </div>
          }
        />
      </div>
    );
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const errorList = Object.values(errors).filter(Boolean) as string[];

  const goTo = (index: number) => {
    setStepIndex(index);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    const found = step.id === "about" ? validateAbout(profile) : step.id === "purpose" ? validateGoals(profile) : {};
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    goTo(stepIndex + 1);
  };

  const persist = (): FitnessProfile => {
    const goals = profile.goals.length ? profile.goals : [profile.primaryGoal];
    const toSave: FitnessProfile = {
      ...profile,
      goals,
      primaryGoal: goals.includes(profile.primaryGoal) ? profile.primaryGoal : goals[0],
    };
    saveFitnessProfile(toSave);
    setActiveProfileId(toSave.id);
    setProfile(toSave);
    setIsNew(false);
    return toSave;
  };

  const saveDraft = () => {
    const found = validateAbout(profile);
    if (Object.keys(found).length) {
      setErrors(found);
      setStepIndex(0);
      return;
    }
    setErrors({});
    setSaveError(null);
    try {
      persist();
      setNotice("Draft saved.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong saving the profile.");
    }
  };

  const finish = () => {
    const about = validateAbout(profile);
    if (Object.keys(about).length) {
      setErrors(about);
      setStepIndex(0);
      return;
    }
    const goals = validateGoals(profile);
    if (Object.keys(goals).length) {
      setErrors(goals);
      setStepIndex(1);
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      const saved = persist();
      saveFitnessPlan(buildFitnessPlan(saved, { weeks: 4 }));
      router.push("/lifeengine/fitness/planner");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong saving the profile.");
      setSaving(false);
    }
  };

  const numberInput = (
    key: keyof FitnessProfile,
    opts: { min: number; max: number; step?: number; placeholder?: string; zeroIsEmpty?: boolean },
  ) => {
    const raw = profile[key] as number | undefined;
    return (
      <Input
        type="number"
        inputMode="decimal"
        min={opts.min}
        max={opts.max}
        step={opts.step}
        placeholder={opts.placeholder}
        value={raw === undefined || (opts.zeroIsEmpty && raw === 0) ? "" : raw}
        onChange={(event) =>
          set(key, (opts.zeroIsEmpty ? Number(event.target.value) || 0 : numOrUndefined(event.target.value)) as never)
        }
        error={Boolean(errors[key as keyof Errors])}
      />
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={isNew ? "New fitness profile" : "Health profile"}
        title={profile.name.trim() ? profile.name : "About this person"}
        description="The more you fill in, the more the plan adapts. Only the first step is required."
      />

      {/* ---------------- stepper ---------------- */}
      <nav aria-label="Profile steps" className="mb-6">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-gray-900">
            Step {stepIndex + 1} of {STEPS.length}
            <span className="font-normal text-gray-500"> · {step.label}</span>
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden>
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>
        <ol className="mt-3 hidden flex-wrap gap-1.5 md:flex">
          {STEPS.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-current={index === stepIndex ? "step" : undefined}
                className={clsx(
                  "inline-flex min-h-[40px] items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
                  index === stepIndex
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                    : index < stepIndex
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-500 hover:bg-gray-100",
                )}
              >
                <span
                  className={clsx(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    index < stepIndex ? "bg-emerald-100 text-emerald-700" : index === stepIndex ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500",
                  )}
                  aria-hidden
                >
                  {index < stepIndex ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {entry.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-6">
        {sourceName && stepIndex === 0 ? (
          <Alert tone="info" title={`Prefilled from ${possessive(sourceName)} profile`}>
            Name, age, gender, goals and health notes came across. Check them
            {profile.heightCm && profile.weightKg ? "." : " and add height and weight."}
          </Alert>
        ) : null}

        {errorList.length ? (
          <Alert tone="risk" title="Check this before you continue">
            {errorList.length === 1 ? <p>{errorList[0]}</p> : (
              <ul>
                {errorList.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </Alert>
        ) : null}

        {/* ---------------- 1. About ---------------- */}
        {step.id === "about" ? (
          <Card className="space-y-5">
            <SectionHeading title="About you" description="Age and body size set heart-rate ranges, calorie targets and how fast the plan builds." />
            <Grid>
              <Field label="Name" required error={errors.name}>
                <Input value={profile.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Ritika" error={Boolean(errors.name)} />
              </Field>
              <Field label="Age" required error={errors.age}>
                {numberInput("age", { min: 5, max: 110 })}
              </Field>
              <Field label="Gender" helper="Used for the metabolic-rate equation.">
                <Select value={profile.sex} onChange={(event) => set("sex", event.target.value as FitnessProfile["sex"])}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Height (cm)" required error={errors.heightCm}>
                {numberInput("heightCm", { min: 90, max: 240, zeroIsEmpty: true, placeholder: "e.g. 165" })}
              </Field>
              <Field label="Weight (kg)" required error={errors.weightKg}>
                {numberInput("weightKg", { min: 20, max: 300, step: 0.1, zeroIsEmpty: true, placeholder: "e.g. 62" })}
              </Field>
              <Field label="Target weight (kg)">{numberInput("targetWeightKg", { min: 20, max: 300, step: 0.1, placeholder: "Optional" })}</Field>
              <Field label="Waist (cm)" helper="Measure at the navel, breathing out. Predicts risk better than BMI.">
                {numberInput("waistCm", { min: 40, max: 200, placeholder: "Optional" })}
              </Field>
              <Field label="Body fat (%)">{numberInput("bodyFatPct", { min: 3, max: 70, placeholder: "Optional" })}</Field>
              <Field label="Ethnicity" helper="South and East Asian healthy-weight ranges are lower.">
                <Select value={profile.ethnicity ?? "other"} onChange={(event) => set("ethnicity", event.target.value as FitnessProfile["ethnicity"])}>
                  <option value="south_asian">South Asian</option>
                  <option value="east_asian">East Asian</option>
                  <option value="caucasian">Caucasian</option>
                  <option value="african">African</option>
                  <option value="hispanic">Hispanic</option>
                  <option value="other">Other or prefer not to say</option>
                </Select>
              </Field>
            </Grid>
          </Card>
        ) : null}

        {/* ---------------- 2. Goals ---------------- */}
        {step.id === "purpose" ? (
          <>
            <Card className="space-y-5">
              <SectionHeading
                title="What do you want from this?"
                description="Pick everything that applies, then choose the main one. The main goal shapes the week; the others adjust it."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Main goal" helper={profile.goals.length ? undefined : "Pick goals below first."}>
                  <Select
                    value={profile.goals.includes(profile.primaryGoal) ? profile.primaryGoal : ""}
                    onChange={(event) => set("primaryGoal", event.target.value as GoalId)}
                    disabled={!profile.goals.length}
                  >
                    {!profile.goals.length ? <option value="">No goals picked yet</option> : null}
                    {profile.goals.map((goal) => (
                      <option key={goal} value={goal}>
                        {GOALS[goal]?.label ?? goal}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="What would success look like?">
                  <Input
                    value={profile.motivation ?? ""}
                    onChange={(event) => set("motivation", event.target.value)}
                    placeholder="e.g. Climb stairs without knee pain"
                  />
                </Field>
              </div>
            </Card>
            <div className="space-y-3">
              {goalsByFamily().map((family, index) => {
                const count = family.goals.filter((g) => profile.goals.includes(g.id)).length;
                return (
                  <Group key={family.family} title={family.label} count={count} defaultOpen={index === 0 || count > 0}>
                    {family.goals.map((goal) => {
                      const selected = profile.goals.includes(goal.id);
                      return (
                        <OptionCard
                          key={goal.id}
                          selected={selected}
                          label={goal.label}
                          meta={goal.purpose}
                          flag={selected && profile.primaryGoal === goal.id ? <Badge tone="info">Main goal</Badge> : null}
                          onClick={() => {
                            const nextGoals = toggleIn(profile.goals, goal.id);
                            setProfile((current) => ({
                              ...current,
                              goals: nextGoals,
                              primaryGoal: nextGoals.includes(current.primaryGoal) ? current.primaryGoal : nextGoals[0] ?? goal.id,
                            }));
                            if (errors.goals) setErrors({});
                          }}
                        />
                      );
                    })}
                  </Group>
                );
              })}
            </div>
          </>
        ) : null}

        {/* ---------------- 3. Baseline ---------------- */}
        {step.id === "baseline" ? (
          <Card className="space-y-5">
            <SectionHeading title="Where you are starting from" description="Be honest rather than hopeful. Starting a little below your capacity is how a plan lasts." />
            <Grid>
              <Field label="Current activity level">
                <Select value={profile.activityLevel} onChange={(event) => set("activityLevel", event.target.value as FitnessProfile["activityLevel"])}>
                  <option value="sedentary">Sedentary: desk job, little movement</option>
                  <option value="light">Lightly active: some walking</option>
                  <option value="moderate">Moderately active: exercise 3 times a week</option>
                  <option value="active">Active: exercise most days</option>
                  <option value="very_active">Very active: daily training or physical job</option>
                </Select>
              </Field>
              <Field label="Exercise experience">
                <Select value={profile.experience} onChange={(event) => set("experience", event.target.value as FitnessProfile["experience"])}>
                  <option value="beginner">Beginner: new or returning after a break</option>
                  <option value="intermediate">Intermediate: comfortable with the basics</option>
                  <option value="advanced">Advanced: years of steady training</option>
                </Select>
              </Field>
              <Field label="Exercise minutes in a typical week" helper="The plan starts near this and builds.">
                {numberInput("currentWeeklyMinutes", { min: 0, max: 1200, placeholder: "e.g. 90" })}
              </Field>
              <Field label="Resting heart rate (bpm)" helper="Measured on waking. Personalises heart-rate zones.">
                {numberInput("restingHr", { min: 35, max: 130, placeholder: "Optional" })}
              </Field>
              <Field label="Blood pressure, systolic">{numberInput("systolicBp", { min: 70, max: 250, placeholder: "e.g. 120" })}</Field>
              <Field label="Blood pressure, diastolic">{numberInput("diastolicBp", { min: 40, max: 160, placeholder: "e.g. 80" })}</Field>
              <Field label="Fasting glucose (mg/dL)">{numberInput("fastingGlucose", { min: 40, max: 500, placeholder: "Optional" })}</Field>
              <Field label="Usual sleep (hours)">{numberInput("sleepHours", { min: 3, max: 12, step: 0.5 })}</Field>
              <Field label="Stress level">
                <Select value={profile.stressLevel ?? "moderate"} onChange={(event) => set("stressLevel", event.target.value as FitnessProfile["stressLevel"])}>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="severe">Severe: affecting daily life</option>
                </Select>
              </Field>
              <Field label="Diet pattern">
                <Select value={profile.dietPattern ?? "other"} onChange={(event) => set("dietPattern", event.target.value as FitnessProfile["dietPattern"])}>
                  <option value="veg">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="eggetarian">Eggetarian</option>
                  <option value="non_veg">Non-vegetarian</option>
                  <option value="jain">Jain</option>
                  <option value="keto">Keto or low carb</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Alcohol">
                <Select value={profile.alcohol ?? "none"} onChange={(event) => set("alcohol", event.target.value as FitnessProfile["alcohol"])}>
                  <option value="none">None</option>
                  <option value="occasional">Occasional</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </Select>
              </Field>
            </Grid>
            <div className="space-y-2 border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-900">What you can do today</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckRow
                  id="walk30"
                  checked={profile.canWalk30MinUnaided}
                  onChange={(v) => set("canWalk30MinUnaided", v)}
                  label="I can walk for 30 minutes without stopping"
                  hint="If not, sessions are split into shorter bouts."
                />
                <CheckRow
                  id="floor"
                  checked={profile.canGetUpFromFloorUnaided}
                  onChange={(v) => set("canGetUpFromFloorUnaided", v)}
                  label="I can get down to the floor and back up unaided"
                  hint="If not, floor work is swapped for seated and standing versions."
                />
                <CheckRow id="smoker" checked={profile.smoker ?? false} onChange={(v) => set("smoker", v)} label="I smoke or vape" />
              </div>
            </div>
          </Card>
        ) : null}

        {/* ---------------- 4. Medical ---------------- */}
        {step.id === "medical" ? (
          <>
            <Card className="space-y-4">
              <SectionHeading
                title="Medical history"
                description="Each condition adds limits: movements left out, an intensity ceiling, changes to exercises and warning signs to watch."
              />
              {profile.conditions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="info">{profile.conditions.length} selected</Badge>
                  {safetyPreview.excludedTags.length ? <Badge tone="warn">{safetyPreview.excludedTags.length} movement patterns left out</Badge> : null}
                  <Badge tone={safetyPreview.level === "clearance_required" ? "risk" : "neutral"}>
                    Intensity up to {safetyPreview.intensityCeiling.replace(/_/g, " ")}
                  </Badge>
                </div>
              ) : null}
            </Card>
            <div className="space-y-3">
              {conditionsByFamily().map((family) => {
                const count = family.conditions.filter((c) => profile.conditions.includes(c.id)).length;
                return (
                  <Group key={family.family} title={CONDITION_FAMILY_LABELS[family.family] ?? family.label} count={count} defaultOpen={count > 0}>
                    {family.conditions.map((condition) => (
                      <OptionCard
                        key={condition.id}
                        selected={profile.conditions.includes(condition.id)}
                        onClick={() => set("conditions", toggleIn(profile.conditions, condition.id))}
                        label={condition.label}
                        flag={condition.clearanceRequired ? <Badge tone="warn">Needs clearance</Badge> : null}
                        meta={condition.note}
                      />
                    ))}
                  </Group>
                );
              })}
              <Group title="Medications" count={profile.medications.length} defaultOpen={profile.medications.length > 0}>
                {MEDICATION_LIST.map((med) => (
                  <OptionCard
                    key={med.id}
                    selected={profile.medications.includes(med.id)}
                    onClick={() => set("medications", toggleIn(profile.medications, med.id))}
                    label={med.label}
                    meta={`e.g. ${med.examples.join(", ")}`}
                  />
                ))}
              </Group>
            </div>
            <Card className="space-y-5">
              <SectionHeading title="Life stage and other details" />
              <Grid>
                <Field label="Weeks pregnant" helper="Leave blank if not pregnant.">
                  {numberInput("pregnancyWeeks", { min: 0, max: 45 })}
                </Field>
                <Field label="Weeks since giving birth" helper="Leave blank if not postpartum.">
                  {numberInput("postpartumWeeks", { min: 0, max: 104 })}
                </Field>
                <Field label="Allergies" helper="Separate with commas.">
                  <Input
                    value={(profile.allergies ?? []).join(", ")}
                    onChange={(event) => set("allergies", event.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  />
                </Field>
              </Grid>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Past surgeries">
                  <Input
                    value={(profile.surgeries ?? []).join(", ")}
                    onChange={(event) => set("surgeries", event.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                    placeholder="e.g. Knee arthroscopy 2019"
                  />
                </Field>
                <Field label="Family history">
                  <Input
                    value={(profile.familyHistory ?? []).join(", ")}
                    onChange={(event) => set("familyHistory", event.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                    placeholder="e.g. Diabetes (father)"
                  />
                </Field>
              </div>
              <Field label="Health notes" helper="Advice from your doctor or physio, restrictions, anything that changes what is safe.">
                <Textarea rows={3} value={profile.medicalNotes ?? ""} onChange={(event) => set("medicalNotes", event.target.value)} />
              </Field>
            </Card>
          </>
        ) : null}

        {/* ---------------- 5. Pain & injuries ---------------- */}
        {step.id === "pain" ? (
          <>
            <Card className="space-y-4">
              <SectionHeading
                title="Where does it hurt?"
                description="Tap an area, then rate it. Pain of 5 or more removes impact and heavy loading there. Long-lasting pain gets a slow, graded approach."
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pain areas">
                {PAIN_REGIONS.map((region) => {
                  const existing = profile.painPoints.find((p) => p.region === region.id);
                  return (
                    <ToggleChip
                      key={region.id}
                      selected={Boolean(existing)}
                      onClick={() =>
                        set(
                          "painPoints",
                          existing
                            ? profile.painPoints.filter((p) => p.region !== region.id)
                            : [...profile.painPoints, { region: region.id, severity: 4, chronic: false } satisfies PainPoint],
                        )
                      }
                    >
                      {region.label}
                      {existing ? <span className="tabular-nums text-indigo-500">{existing.severity}/10</span> : null}
                    </ToggleChip>
                  );
                })}
              </div>
            </Card>

            {profile.painPoints.map((pain, index) => {
              const label = PAIN_REGIONS.find((r) => r.id === pain.region)?.label ?? pain.region;
              const update = (patch: Partial<PainPoint>) => {
                const nextPain = [...profile.painPoints];
                nextPain[index] = { ...pain, ...patch };
                set("painPoints", nextPain);
              };
              return (
                <Card key={pain.region} className="space-y-4">
                  <SectionHeading
                    level={3}
                    title={label}
                    action={
                      <Button variant="subtle" size="sm" onClick={() => set("painPoints", profile.painPoints.filter((p) => p.region !== pain.region))}>
                        <Trash2 aria-hidden />
                        Remove
                      </Button>
                    }
                  />
                  <div>
                    <label htmlFor={`pain-${pain.region}`} className="flex items-baseline justify-between gap-3 text-sm font-semibold text-gray-700">
                      Pain right now
                      <span className="font-normal tabular-nums text-gray-500">
                        {pain.severity}/10, {pain.severity <= 3 ? "mild" : pain.severity <= 6 ? "moderate" : "severe"}
                      </span>
                    </label>
                    <input
                      id={`pain-${pain.region}`}
                      type="range"
                      min={0}
                      max={10}
                      value={pain.severity}
                      onChange={(event) => update({ severity: Number(event.target.value) })}
                      className="mt-2 h-10 w-full accent-indigo-600"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <CheckRow
                      id={`chronic-${pain.region}`}
                      checked={pain.chronic}
                      onChange={(v) => update({ chronic: v })}
                      label="It has lasted more than three months"
                      hint="Long-lasting pain responds to gradual loading, not rest."
                    />
                    <CheckRow
                      id={`flare-${pain.region}`}
                      checked={pain.flareUp ?? false}
                      onChange={(v) => update({ flareUp: v })}
                      label="It is flared up right now"
                      hint="Lowers intensity and shortens sessions until it settles."
                    />
                  </div>
                  <Field label="What makes it worse?">
                    <Input value={pain.triggers ?? ""} onChange={(event) => update({ triggers: event.target.value })} placeholder="e.g. Stairs, long sitting" />
                  </Field>
                </Card>
              );
            })}

            <Card className="space-y-4">
              <SectionHeading
                level={3}
                title="Injuries and surgeries"
                description="Anything from the last couple of years that still affects you."
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      set("injuries", [...profile.injuries, { description: "", region: "knee", monthsAgo: 6, surgical: false, clearedByClinician: false }])
                    }
                  >
                    <Plus aria-hidden />
                    Add injury
                  </Button>
                }
              />
              {profile.injuries.length === 0 ? <p className="text-sm text-gray-500">None added.</p> : null}
              {profile.injuries.map((injury, index) => {
                const update = (patch: Partial<typeof injury>) => {
                  const nextInjuries = [...profile.injuries];
                  nextInjuries[index] = { ...injury, ...patch };
                  set("injuries", nextInjuries);
                };
                return (
                  <div key={index} className="space-y-4 rounded-xl border border-gray-200 p-4">
                    <Grid>
                      <Field label="What happened">
                        <Input value={injury.description} onChange={(event) => update({ description: event.target.value })} placeholder="e.g. ACL reconstruction" />
                      </Field>
                      <Field label="Area">
                        <Select value={injury.region} onChange={(event) => update({ region: event.target.value as PainRegion })}>
                          {PAIN_REGIONS.map((region) => (
                            <option key={region.id} value={region.id}>
                              {region.label}
                            </option>
                          ))}
                          <option value="other">Other</option>
                        </Select>
                      </Field>
                      <Field label="Months ago">
                        <Input type="number" min={0} max={600} value={injury.monthsAgo} onChange={(event) => update({ monthsAgo: Number(event.target.value) })} />
                      </Field>
                    </Grid>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CheckRow id={`surgical-${index}`} checked={injury.surgical} onChange={(v) => update({ surgical: v })} label="Needed surgery" />
                      <CheckRow
                        id={`cleared-${index}`}
                        checked={injury.clearedByClinician}
                        onChange={(v) => update({ clearedByClinician: v })}
                        label="Cleared by a clinician"
                      />
                    </div>
                    <Button variant="subtle" size="sm" onClick={() => set("injuries", profile.injuries.filter((_, i) => i !== index))}>
                      <Trash2 aria-hidden />
                      Remove injury
                    </Button>
                  </div>
                );
              })}
            </Card>
          </>
        ) : null}

        {/* ---------------- 6. Safety screen ---------------- */}
        {step.id === "screen" ? (
          <>
            <Card className="space-y-4">
              <SectionHeading
                title="Safety screen"
                description="Standard questions asked before exercise. A yes changes what the plan prescribes, and some mean seeing a doctor first."
              />
              <div className="space-y-2">
                {SCREEN_QUESTIONS.map((item) => (
                  <CheckRow
                    key={item.key}
                    id={`screen-${item.key}`}
                    checked={profile.screen[item.key]}
                    onChange={(v) => set("screen", { ...profile.screen, [item.key]: v })}
                    label={item.question}
                  />
                ))}
                <CheckRow
                  id="cleared"
                  checked={profile.hasMedicalClearance ?? false}
                  onChange={(v) => set("hasMedicalClearance", v)}
                  label="A doctor has already cleared me to exercise"
                  hint="Only tick this if you have that clearance. Every other safety limit still applies."
                />
              </div>
            </Card>

            <Card className="space-y-4">
              <SectionHeading level={3} title="What your answers mean" />
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
                  <p>The plan is still built so you can take it to your clinician.</p>
                </Alert>
              ) : safetyPreview.level === "caution" ? (
                <Alert tone="info" title="The plan will be adapted">
                  {safetyPreview.excludedTags.length} movement patterns left out. Intensity up to {safetyPreview.intensityCeiling.replace(/_/g, " ")}, impact up to{" "}
                  {safetyPreview.maxImpact}.
                </Alert>
              ) : (
                <Alert tone="good" title="No red flags">
                  You are clear to start. The plan still builds gradually so it lasts.
                </Alert>
              )}
              {safetyPreview.requiredModifications.length ? (
                <div>
                  <p className="text-sm font-semibold text-gray-700">Changes that will be applied</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {safetyPreview.requiredModifications.slice(0, 10).map((mod) => (
                      <li key={mod}>{mod}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* ---------------- 7. Time & place ---------------- */}
        {step.id === "logistics" ? (
          <>
            <Card className="space-y-5">
              <SectionHeading title="Time and place" description="Pick numbers you can hit in a busy week, not your best week." />
              <Grid>
                <Field label="Indoor or outdoor">
                  <Select
                    value={profile.environmentPreference}
                    onChange={(event) => set("environmentPreference", event.target.value as FitnessProfile["environmentPreference"])}
                  >
                    <option value="both">Both</option>
                    <option value="indoor">Indoor only</option>
                    <option value="outdoor">Outdoor only</option>
                  </Select>
                </Field>
                <Field label="Days per week">
                  <Input type="number" min={1} max={7} value={profile.daysPerWeek} onChange={(event) => set("daysPerWeek", Number(event.target.value))} />
                </Field>
                <Field label="Minutes per session">
                  <Input
                    type="number"
                    min={10}
                    max={150}
                    step={5}
                    value={profile.minutesPerSession}
                    onChange={(event) => set("minutesPerSession", Number(event.target.value))}
                  />
                </Field>
                <Field label="Preferred time">
                  <Select value={profile.preferredTime} onChange={(event) => set("preferredTime", event.target.value as FitnessProfile["preferredTime"])}>
                    <option value="early_morning">Early morning (before 7am)</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="flexible">Flexible</option>
                  </Select>
                </Field>
                <Field label="Space available">
                  <Select value={profile.spaceConstraint ?? "room"} onChange={(event) => set("spaceConstraint", event.target.value as FitnessProfile["spaceConstraint"])}>
                    <option value="tiny_room">Just room for a mat</option>
                    <option value="room">A room</option>
                    <option value="hall_or_garden">Hall, terrace or garden</option>
                    <option value="gym">Gym</option>
                    <option value="open_space">Open space or park nearby</option>
                  </Select>
                </Field>
                <Field label="Climate">
                  <Select value={profile.climate ?? "temperate"} onChange={(event) => set("climate", event.target.value as FitnessProfile["climate"])}>
                    <option value="hot_humid">Hot and humid</option>
                    <option value="hot_dry">Hot and dry</option>
                    <option value="temperate">Temperate</option>
                    <option value="cold">Cold</option>
                    <option value="monsoon">Monsoon or heavy rain</option>
                    <option value="polluted_city">Polluted city</option>
                  </Select>
                </Field>
              </Grid>
              <CheckRow
                id="noise"
                checked={profile.noiseConstraint ?? false}
                onChange={(v) => set("noiseConstraint", v)}
                label="I need to keep it quiet (flat, neighbours below)"
                hint="Removes jumping and other impact."
              />
            </Card>

            <Card className="space-y-4">
              <SectionHeading level={3} title="Equipment you can use" description="Only what you can get to. A mat and one resistance band open up much of the library." />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Equipment">
                {EQUIPMENT_CHOICES.map((item) => (
                  <ToggleChip
                    key={item}
                    selected={profile.availableEquipment.includes(item)}
                    onClick={() => set("availableEquipment", toggleIn(profile.availableEquipment, item))}
                  >
                    {EQUIPMENT_LABELS[item] ?? item}
                  </ToggleChip>
                ))}
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="space-y-4">
                <SectionHeading level={3} title="Activities you enjoy" description="Scored higher. Enjoyment is what keeps people going." />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Activities you enjoy">
                  {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((category) => (
                    <ToggleChip
                      key={category}
                      selected={profile.likedCategories.includes(category)}
                      onClick={() => set("likedCategories", toggleIn(profile.likedCategories, category))}
                    >
                      {CATEGORY_LABELS[category]}
                    </ToggleChip>
                  ))}
                </div>
              </Card>
              <Card className="space-y-4">
                <SectionHeading level={3} title="Activities to leave out" description="Removed completely. Leaving out too much narrows the plan." />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Activities to leave out">
                  {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((category) => (
                    <ToggleChip
                      key={category}
                      tone="warn"
                      selected={profile.dislikedCategories.includes(category)}
                      onClick={() => set("dislikedCategories", toggleIn(profile.dislikedCategories, category))}
                    >
                      {CATEGORY_LABELS[category]}
                    </ToggleChip>
                  ))}
                </div>
              </Card>
            </div>
          </>
        ) : null}

        {/* ---------------- footer ---------------- */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          {saveError ? (
            <Alert tone="risk" className="mb-4">
              {saveError}
            </Alert>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              <Button variant="subtle" onClick={saveDraft} disabled={saving}>
                Save draft
              </Button>
              <Link
                href="/lifeengine/fitness"
                className="inline-flex min-h-[40px] items-center rounded-[10px] px-4 text-sm font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                Cancel
              </Link>
              <span role="status" className="text-sm font-medium text-emerald-700">
                {notice}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => goTo(stepIndex - 1)} disabled={stepIndex === 0}>
                <ChevronLeft aria-hidden />
                Back
              </Button>
              {isLast ? (
                <Button onClick={finish} disabled={saving} className="flex-1 sm:flex-none">
                  {saving ? "Building plan" : "Save and build plan"}
                </Button>
              ) : (
                <Button onClick={next} className="flex-1 sm:flex-none">
                  Next
                  <ChevronRight aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
