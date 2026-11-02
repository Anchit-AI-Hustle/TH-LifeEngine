"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Check, CircleAlert, Cpu, RotateCcw, Sparkles, UserRound, WandSparkles } from "lucide-react";
import {
  PlanForm,
  PlanFormData,
  defaultPlanFormData,
  validatePlanFormData,
  planFormProgress,
  planFieldPasses,
  PLAN_FORM_FIELD_IDS,
} from "@/components/lifeengine/PlanForm";
import {
  SectionCard,
  activityLabel,
  dietLabel,
  durationLabel,
  intensityLabel,
  planTypeLabel,
} from "@/components/lifeengine/PlanConfigurator";
import { generatePlan, formatErrorMessage } from "@/lib/lifeengine/api";
import { GenerationProgress } from "@/components/lifeengine/GenerationProgress";
import { useAppVersion } from "@/components/providers/AppVersionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

const GENDER_MAP: Record<string, "M" | "F" | "Other"> = {
  male: "M",
  female: "F",
  other: "Other",
};

const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other" };

const SLOT_PRESETS: Record<
  string,
  {
    start: string;
    end: string;
  }
> = {
  morning: { start: "06:00", end: "07:00" },
  late_morning: { start: "10:00", end: "11:00" },
  afternoon: { start: "13:00", end: "14:00" },
  evening: { start: "18:00", end: "19:00" },
  night: { start: "21:00", end: "22:00" },
  flexible: { start: "09:00", end: "10:00" },
};

const STEPS = [
  { id: "step-profile", title: "Profile" },
  { id: "step-plan", title: "Plan" },
  { id: "step-preferences", title: "Preferences" },
  { id: "step-review", title: "Review & generate" },
] as const;

const ERROR_LABELS: Record<string, string> = {
  fullName: "Full name",
  age: "Age",
  gender: "Gender",
  planTypes: "Plan types",
};

interface Profile {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  goals: string[];
  healthConcerns: string;
  experience: "beginner" | "intermediate" | "advanced";
  preferredTime: "morning" | "evening" | "flexible";
  subscriptionType?: string;
  createdAt?: string;
  updatedAt?: string;
}

function focusField(field: string) {
  const el = document.getElementById(PLAN_FORM_FIELD_IDS[field] ?? field);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const target = el.matches("fieldset") ? el.querySelector<HTMLElement>("input") ?? el : el;
  target.focus({ preventScroll: true });
}

export default function CreatePlan() {
  const router = useRouter();
  const { version: appVersion } = useAppVersion();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlanFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generatedPlanId, setGeneratedPlanId] = useState<string>("");
  const [activeStep, setActiveStep] = useState(0);
  // Bumped on every run and on cancel, so a cancelled run's result is ignored.
  const runIdRef = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Fetch profiles on mount
  useEffect(() => {
    async function fetchProfiles() {
      try {
        const response = await fetch("/api/lifeengine/profiles");
        if (response.ok) {
          const data = await response.json();
          setProfiles(data.profiles || []);
        }
      } catch (err) {
        console.error("Failed to fetch profiles:", err);
      } finally {
        setLoadingProfiles(false);
      }
    }
    fetchProfiles();
  }, []);

  // Update form when profile is selected
  useEffect(() => {
    if (selectedProfileId && selectedProfileId !== "new") {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (profile) {
        // Use functional setState to avoid formData in dependencies (prevents infinite loop)
        setFormData(prevData => ({
          ...prevData,
          fullName: profile.name,
          age: profile.age,
          gender: profile.gender,
          goals: profile.goals || [],
          preferredTime: profile.preferredTime || "flexible",
          // Map experience to intensity (values from INTENSITY_OPTIONS)
          intensity: profile.experience === "beginner" ? "low" :
                     profile.experience === "advanced" ? "high" : "moderate",
        }));
      }
    }
  }, [selectedProfileId, profiles]); // Safe - no formData dependency

  // Highlight the step whose card is in view.
  const showForm = !loading && !generatedPlanId;
  useEffect(() => {
    if (!showForm || typeof IntersectionObserver === "undefined") return;
    const els = STEPS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const idx = STEPS.findIndex((s) => s.id === visible[0].target.id);
          if (idx >= 0) setActiveStep(idx);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [showForm]);

  const runGeneration = async () => {
    setError("");
    setFormErrors({});
    setGeneratedPlanId("");

    // Validate form
    const validation = validatePlanFormData(formData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      requestAnimationFrame(() => {
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        summaryRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    const runId = ++runIdRef.current;
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      // Use selected profile ID or create inline profile
      const profileId = selectedProfileId && selectedProfileId !== "new"
        ? selectedProfileId
        : `inline_${Date.now()}`;

      const normalizedGender = GENDER_MAP[formData.gender] ?? "Other";

      // Parse duration from the new format (e.g., "1_week", "2_weeks", "3_months")
      let durationValue: number;
      let durationUnit: "days" | "weeks" | "months";

      if (formData.duration.includes("week")) {
        durationValue = parseInt(formData.duration.match(/\d+/)?.[0] || "1", 10);
        durationUnit = "weeks";
      } else if (formData.duration.includes("month")) {
        durationValue = parseInt(formData.duration.match(/\d+/)?.[0] || "1", 10);
        durationUnit = "months";
      } else {
        // Fallback to days
        durationValue = parseInt(formData.duration.match(/\d+/)?.[0] || "7", 10);
        durationUnit = "days";
      }

      const preferredSlot = SLOT_PRESETS[formData.preferredTime] ?? SLOT_PRESETS.flexible;
      const daysPerWeek =
        formData.activityLevel === "intense" ? 6 : formData.activityLevel === "sedentary" ? 4 : 5;

      // Convert PlanFormData to API format
      const payload = {
        profileId,
        appVersion,
        profileSnapshot: {
          id: profileId,
          name: formData.fullName,
          age: formData.age,
          gender: normalizedGender,
          height_cm: 170,
          weight_kg: 70,
          region: "Global",
          activity_level: formData.activityLevel,
          dietary: {
            type: formData.dietType,
            allergies: [],
            avoid_items: [],
            cuisine_pref: []
          },
          medical_flags: formData.chronicConditions,
          preferences: {
            tone: "balanced",
            indoor_only: false,
            notes: `Work: ${formData.workSchedule}, Preferred Time: ${formData.preferredTime}, Sleep: ${formData.sleepHours}h, Stress: ${formData.stressLevel}`
          },
          availability: {
            days_per_week: daysPerWeek,
            preferred_slots: [preferredSlot]
          }
        },
        plan_type: {
          primary: formData.planTypes[0] || "combined",
          secondary: formData.planTypes.slice(1)
        },
        goals: formData.goals.map((goal, index) => ({
          name: goal,
          priority: index + 1
        })),
        conditions: formData.chronicConditions,
        duration: {
          unit: durationUnit,
          value: durationValue
        },
        time_budget_min_per_day: formData.intensity === "low" ? 30 : formData.intensity === "high" ? 60 : 45,
        experience_level: formData.intensity === "low" ? "beginner" : formData.intensity === "high" ? "advanced" : "intermediate",
        equipment: []
      };

      const result = await generatePlan(payload);
      if (runId !== runIdRef.current) return; // cancelled while waiting

      if (typeof window !== 'undefined' && result?.plan) {
        try {
          const cachedPayload = {
            plan: result.plan,
            warnings: result.warnings || [],
            analytics: result.analytics || null,
            planName: `Plan for ${formData.fullName}`,
          };
          window.sessionStorage.setItem(
            `th_plan_cache_${result.planId}`,
            JSON.stringify(cachedPayload)
          );
        } catch (error) {
          console.warn('Failed to cache plan locally:', error);
        }
      }

      setGeneratedPlanId(result.planId);

      // Show the success state briefly, then open the plan
      setTimeout(() => {
        router.push(`/lifeengine/plan/${result.planId}`);
      }, 2000);

    } catch (err: any) {
      if (runId !== runIdRef.current) return;
      console.error('[CreatePlan] Generation failed:', err);

      const errorMessage = formatErrorMessage(err);
      const timeoutHint = errorMessage.toLowerCase().includes('timeout')
        ? ' Try a 1, 3 or 5 day plan, or a shorter duration, before retrying.'
        : '';
      setError(`${errorMessage}.${timeoutHint}`);
    } finally {
      if (runId === runIdRef.current) setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runGeneration();
  };

  const cancelGeneration = () => {
    runIdRef.current++;
    setLoading(false);
  };

  const progress = planFormProgress(formData);
  const stepDone = [progress.profile, progress.plan, progress.profile && progress.plan, false];
  const missing = [
    !progress.profile && (formData.fullName.trim().length < 2 ? "a name" : "age and gender"),
    !progress.plan && "a plan type",
  ].filter(Boolean) as string[];
  const ready = missing.length === 0;
  const readyText = ready ? "Ready to generate" : `Add ${missing.join(" and ")} to continue`;
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const engineLabel = appVersion === "oss" ? "Quick plan (no AI)" : "AI plan";
  const engineHint =
    appVersion === "oss"
      ? "Quick plan: built in seconds from the app's own library, without AI. Change this in Settings."
      : "AI plan: written around the person's goals and health notes. Takes a minute or two. Change this in Settings.";
  const errorEntries = Object.entries(formErrors).filter(([field]) => !planFieldPasses(field, formData));

  const summaryRows: { label: string; value: string; step: string; missing?: boolean }[] = [
    {
      label: "For",
      value: formData.fullName.trim()
        ? [formData.fullName.trim(), formData.age, GENDER_LABEL[formData.gender] ?? (formData.gender || "gender not chosen")].join(", ")
        : "Not set",
      step: "step-profile",
      missing: !progress.profile,
    },
    {
      label: "Plan types",
      value: formData.planTypes.length ? formData.planTypes.map(planTypeLabel).join(", ") : "Not set",
      step: "step-plan",
      missing: !progress.plan,
    },
    { label: "Duration", value: durationLabel(formData.duration), step: "step-plan" },
    { label: "Intensity", value: intensityLabel(formData.intensity), step: "step-plan" },
    { label: "Diet", value: dietLabel(formData.dietType), step: "step-preferences" },
    { label: "Activity", value: activityLabel(formData.activityLevel), step: "step-preferences" },
    {
      label: "Goals",
      value: formData.goals.length ? formData.goals.join(", ") : "None chosen",
      step: "step-preferences",
    },
    {
      label: "Health",
      value: formData.chronicConditions.length ? formData.chronicConditions.join(", ") : "None reported",
      step: "step-preferences",
    },
  ];

  const generateButton = (extra?: string, hintId = "generate-hint") => (
    <button
      type="submit"
      disabled={loading}
      aria-describedby={hintId}
      className={clsx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50",
        ready ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-gray-900/80 text-white hover:bg-gray-900",
        extra,
      )}
    >
      <WandSparkles className="h-4 w-4" aria-hidden />
      Generate plan
    </button>
  );

  return (
    <div>
      <PageHeader
        eyebrow="New plan"
        title="Create a wellness plan"
        description="Pick a profile, choose the plan types and duration, and get a day-by-day plan in under a minute."
        actions={
          <Link
            href="/lifeengine/settings"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
            title={engineHint}
            aria-label={`${engineLabel}. ${engineHint}`}
          >
            {appVersion === "oss" ? <Cpu className="h-3.5 w-3.5 text-gray-500" aria-hidden /> : <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden />}
            {engineLabel}
          </Link>
        }
      />

      {(loading || generatedPlanId) && (
        <div className="mx-auto max-w-3xl">
          <GenerationProgress
            status={generatedPlanId ? "success" : "running"}
            title={`Creating ${formData.fullName.trim() ? `${formData.fullName.trim()}'s` : "your"} plan`}
            estimatedSeconds={appVersion === "oss" ? 15 : 165}
            onCancel={cancelGeneration}
            successText="Opening your plan now"
            successHref={generatedPlanId ? `/lifeengine/plan/${generatedPlanId}` : undefined}
          />
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="min-w-0 space-y-6">
            {/* Phone and tablet: compact progress header */}
            <nav aria-label="Steps" className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  Step {activeStep + 1} of {STEPS.length}
                  <span className="font-normal text-gray-500"> · {STEPS[activeStep].title}</span>
                </p>
                <p className="text-xs text-gray-500">{ready ? "Ready" : `${[progress.profile, progress.plan].filter(Boolean).length} of 2 required`}</p>
              </div>
              <ol className="mt-2.5 grid grid-cols-4 gap-1.5">
                {STEPS.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-label={`Step ${i + 1}: ${s.title}${stepDone[i] ? " (done)" : ""}`}
                      aria-current={activeStep === i ? "step" : undefined}
                      className="flex h-6 items-center"
                    >
                      <span
                        className={clsx(
                          "block h-1.5 w-full rounded-full",
                          stepDone[i] ? "bg-indigo-600" : activeStep === i ? "bg-indigo-300" : "bg-gray-200",
                        )}
                      />
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {error && (
              <GenerationProgress
                status="error"
                error={error}
                onRetry={() => void runGeneration()}
                onEdit={() => {
                  setError("");
                  document.getElementById("step-profile")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            )}

            <PlanForm
              formData={formData}
              setFormData={setFormData}
              errors={formErrors}
              profileSlot={
                loadingProfiles ? (
                  <div className="space-y-2" aria-hidden>
                    <div className="h-4 w-32 animate-pulse rounded-lg bg-gray-100" />
                    <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    <p>
                      No saved profiles yet. Fill in the details below, or{" "}
                      <Link href="/lifeengine/profiles" className="font-medium text-indigo-700 hover:underline">
                        add a profile
                      </Link>{" "}
                      to reuse them next time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Field
                      label="Start from a saved profile"
                      helper={
                        selectedProfile
                          ? undefined
                          : "Fills in the name, age, goals and timing. You can still change anything."
                      }
                    >
                      <Select id="profile-select" value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}>
                        <option value="">Choose a profile</option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name} ({profile.age}, {GENDER_LABEL[profile.gender] ?? profile.gender})
                          </option>
                        ))}
                        <option value="new">Someone new (enter details below)</option>
                      </Select>
                    </Field>
                    {selectedProfile && (
                      <p role="status" className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Filled in from {selectedProfile.name}&apos;s profile. Change anything below.
                      </p>
                    )}
                  </div>
                )
              }
            />

            <SectionCard
              id="step-review"
              step={4}
              title="Review and generate"
              description="Check the details, then generate. You can edit the plan afterwards."
            >
              {errorEntries.length > 0 && (
                <div
                  ref={summaryRef}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 focus:outline-none"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                    <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                    {errorEntries.length === 1 ? "One thing needs fixing" : `${errorEntries.length} things need fixing`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {errorEntries.map(([field, message]) => (
                      <li key={field}>
                        <button
                          type="button"
                          onClick={() => focusField(field)}
                          className="min-h-[32px] text-left text-sm text-red-700 underline decoration-red-300 underline-offset-2 hover:decoration-red-700"
                        >
                          {ERROR_LABELS[field] ?? field}: {message}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {summaryRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 px-4 py-2.5 sm:grid-cols-[120px_minmax(0,1fr)]">
                    <dt className="text-sm text-gray-500">{row.label}</dt>
                    <dd className={clsx("min-w-0 break-words text-sm", row.missing ? "text-amber-700" : "text-gray-900")}>
                      {row.value}
                    </dd>
                  </div>
                ))}
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 px-4 py-2.5 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <dt className="text-sm text-gray-500">Made with</dt>
                  <dd className="text-sm text-gray-900" title={engineHint}>
                    {engineLabel}{" "}
                    <Link href="/lifeengine/settings" className="font-medium text-indigo-700 hover:underline">
                      Change
                    </Link>
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 sm:flex-none"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(defaultPlanFormData);
                      setFormErrors({});
                    }}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 sm:flex-none"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Reset form
                  </button>
                </div>
                <div className="hidden lg:block">{generateButton(undefined, "generate-hint")}</div>
              </div>
            </SectionCard>
          </div>

          {/* Desktop: sticky stepper, summary and call to action */}
          <aside className="hidden lg:sticky lg:top-8 lg:block">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Your plan</h2>
              <nav aria-label="Steps" className="mt-3">
                <ol className="space-y-1">
                  {STEPS.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        aria-current={activeStep === i ? "step" : undefined}
                        className={clsx(
                          "flex min-h-[40px] items-center gap-3 rounded-xl px-2 text-sm transition-colors",
                          activeStep === i ? "bg-indigo-50 font-medium text-indigo-700" : "text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        <span
                          className={clsx(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                            stepDone[i] && i !== 2
                              ? "bg-indigo-600 text-white"
                              : activeStep === i
                                ? "bg-white text-indigo-700 ring-1 ring-indigo-300"
                                : "bg-gray-100 text-gray-600",
                          )}
                          aria-hidden
                        >
                          {stepDone[i] && i !== 2 ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">{s.title}</span>
                        {i === 2 && <span className="text-xs font-normal text-gray-400">Optional</span>}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                {summaryRows.slice(0, 4).map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
                    <dt className="shrink-0 text-gray-500">{row.label}</dt>
                    <dd className={clsx("min-w-0 text-right", row.missing ? "text-amber-700" : "font-medium text-gray-900")}>
                      {row.label === "Plan types" && formData.planTypes.length > 2
                        ? `${planTypeLabel(formData.planTypes[0])} +${formData.planTypes.length - 1}`
                        : row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 space-y-2">
                {generateButton("w-full")}
                <p
                  id="generate-hint"
                  className={clsx("flex items-center justify-center gap-1.5 text-center text-xs", ready ? "text-emerald-700" : "text-gray-500")}
                >
                  {ready && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  {readyText}
                </p>
              </div>
            </div>
          </aside>

          {/* Phone and tablet: sticky action bar */}
          <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(16,24,40,0.12)] backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex items-center gap-3">
              <p id="generate-hint-mobile" className={clsx("min-w-0 flex-1 text-xs", ready ? "text-emerald-700" : "text-gray-600")}>
                <span className="block font-semibold text-gray-900">
                  {durationLabel(formData.duration)}
                  {formData.planTypes.length > 0 &&
                    ` · ${formData.planTypes.length} ${formData.planTypes.length === 1 ? "type" : "types"}`}
                </span>
                {readyText}
              </p>
              {generateButton("shrink-0", "generate-hint-mobile")}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
