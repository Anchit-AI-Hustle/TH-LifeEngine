"use client";

import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  Activity,
  Baby,
  Bandage,
  BicepsFlexed,
  Brain,
  Check,
  ChevronDown,
  Droplets,
  Dumbbell,
  Flame,
  Flower2,
  HandHeart,
  HeartPulse,
  Hourglass,
  Layers,
  Leaf,
  Moon,
  PersonStanding,
  Salad,
  Scale,
  ShieldPlus,
  Soup,
  Sparkles,
  Stethoscope,
  Trophy,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import CheckboxDropdown from "@/app/components/ui/CheckboxDropdown";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  PLAN_TYPE_OPTIONS,
  DURATION_OPTIONS,
  INTENSITY_OPTIONS,
  FORMAT_OPTIONS,
  FOCUS_AREA_OPTIONS,
  GOAL_OPTIONS,
  DIET_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  CHRONIC_CONDITION_OPTIONS,
  PlanFormState,
  getDietLabel,
} from "@/lib/lifeengine/planConfig";

/* ------------------------------------------------------------------ */
/* Display copy for the option lists (values stay as in planConfig).   */
/* ------------------------------------------------------------------ */

const PLAN_TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  yoga: { label: "Yoga & flexibility", icon: Flower2 },
  fitness: { label: "Fitness & strength", icon: Dumbbell },
  diet: { label: "Diet & nutrition", icon: Salad },
  mental_health: { label: "Mental health", icon: Brain },
  sleep: { label: "Sleep & recovery", icon: Moon },
  weight_loss: { label: "Weight loss", icon: Scale },
  muscle_building: { label: "Muscle building", icon: BicepsFlexed },
  cardio: { label: "Cardio & endurance", icon: HeartPulse },
  hiit: { label: "HIIT", icon: Zap },
  pilates: { label: "Pilates", icon: PersonStanding },
  meditation: { label: "Meditation & breathwork", icon: Wind },
  stress_management: { label: "Stress management", icon: Leaf },
  prenatal: { label: "Prenatal & postnatal", icon: Baby },
  senior: { label: "Senior wellness", icon: HandHeart },
  sports: { label: "Sports performance", icon: Trophy },
  rehab: { label: "Rehab & recovery", icon: Bandage },
  holistic: { label: "Holistic wellness", icon: Sparkles },
  metabolic: { label: "Metabolic health", icon: Flame },
  hormone: { label: "Hormone balance", icon: Activity },
  gut_health: { label: "Gut health", icon: Soup },
  immune: { label: "Immunity", icon: ShieldPlus },
  detox: { label: "Detox", icon: Droplets },
  anti_aging: { label: "Healthy ageing", icon: Hourglass },
  chronic_disease: { label: "Chronic conditions", icon: Stethoscope },
  combined: { label: "Combined", icon: Layers },
};

/** The plan types shown before "Show all". */
const FEATURED_PLAN_TYPES = ["yoga", "fitness", "diet", "sleep", "mental_health", "weight_loss", "stress_management", "combined"];

export function planTypeLabel(value: string) {
  return PLAN_TYPE_META[value]?.label ?? PLAN_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

const INTENSITY_META: Record<string, { label: string; hint: string }> = {
  low: { label: "Gentle", hint: "Low effort, recovery first" },
  moderate: { label: "Balanced", hint: "Moderate, steady progress" },
  high: { label: "Athletic", hint: "High effort, fast progress" },
};

export function intensityLabel(value: string) {
  return INTENSITY_META[value]?.label ?? INTENSITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

const FORMAT_META: Record<string, string> = { text: "On screen", pdf: "PDF", both: "On screen + PDF" };

const ACTIVITY_META: Record<string, { label: string; hint: string }> = {
  sedentary: { label: "Sedentary", hint: "Mostly sitting" },
  light: { label: "Light", hint: "Walks, chores" },
  moderate: { label: "Moderate", hint: "Active 3-4 days" },
  intense: { label: "Intense", hint: "Trains most days" },
};

export function activityLabel(value: string) {
  return ACTIVITY_META[value]?.label ?? value;
}

const STRESS_OPTIONS = [
  { value: "low", label: "Low", hint: "Mostly relaxed" },
  { value: "medium", label: "Medium", hint: "Some stress" },
  { value: "high", label: "High", hint: "A lot of stress" },
];

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function dietLabel(value: string) {
  return sentenceCase(getDietLabel(value));
}

/** "1 Day • Rapid Reset" -> { label: "1 day", hint: "Rapid reset" } */
function splitDuration(raw: string) {
  const [main, sub] = raw.split("•").map((s) => s.trim());
  return {
    label: main.replace(/\b(Days?|Weeks?|Months?)\b/, (m) => m.toLowerCase()),
    hint: sub ? sentenceCase(sub) : undefined,
  };
}

export function durationLabel(value: string) {
  const opt = DURATION_OPTIONS.find((o) => o.value === value);
  return opt ? splitDuration(opt.label).label : value;
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                      */
/* ------------------------------------------------------------------ */

export type StepStatus = "complete" | "optional" | "todo";

/** A numbered step card: number (or tick when done), title, description, then the fields. */
export function SectionCard({
  id,
  step,
  title,
  description,
  status,
  children,
}: {
  id?: string;
  step?: number;
  title: string;
  description?: ReactNode;
  status?: StepStatus;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        {step !== undefined && (
          <span
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
              status === "complete" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700",
            )}
            aria-hidden
          >
            {status === "complete" ? <Check className="h-4 w-4" /> : step}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-base font-semibold text-gray-900">
            {step !== undefined && <span className="sr-only">Step {step}: </span>}
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
        {status === "complete" && (
          <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <Check className="h-3 w-3" aria-hidden />
            Done
          </span>
        )}
        {status === "optional" && (
          <span className="mt-1 inline-flex shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            Optional
          </span>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

/** A sub-heading inside a step card. */
export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</h3>;
}

type Choice = { value: string; label: string; hint?: string; icon?: LucideIcon };

/** Single choice as a row of selectable tiles (real radios underneath, so arrow keys work). */
export function ChoiceGroup({
  legend,
  helper,
  options,
  value,
  onChange,
  columns = "grid-cols-3",
  required,
  error,
  id,
  name,
}: {
  legend: string;
  helper?: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
  columns?: string;
  required?: boolean;
  error?: string;
  id?: string;
  name?: string;
}) {
  const autoName = useId();
  const groupName = name ?? autoName;
  const noteId = `${groupName}-note`;
  return (
    <fieldset id={id} tabIndex={id ? -1 : undefined} aria-describedby={helper || error ? noteId : undefined} className="min-w-0 focus:outline-none">
      <legend className="mb-1.5 text-[13px] font-semibold text-gray-700">
        {legend}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        )}
      </legend>
      <div className={clsx("grid gap-2", columns)}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const checked = value === opt.value;
          return (
            <label key={opt.value} className="relative block min-w-0 cursor-pointer">
              <input
                type="radio"
                name={groupName}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="peer sr-only"
              />
              <span
                className={clsx(
                  "flex h-full min-h-[44px] flex-col justify-center rounded-xl border px-3 py-2 text-left transition-colors",
                  "peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-100",
                  checked
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                    : error
                      ? "border-red-300 bg-white hover:bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                <span className="flex items-center gap-2">
                  {Icon && <Icon className={clsx("h-4 w-4 shrink-0", checked ? "text-indigo-600" : "text-gray-400")} aria-hidden />}
                  <span className={clsx("min-w-0 text-sm font-medium", checked ? "text-gray-900" : "text-gray-700")}>{opt.label}</span>
                </span>
                {opt.hint && <span className="mt-0.5 block text-xs text-gray-500">{opt.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={noteId} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : helper ? (
        <p id={noteId} className="mt-1.5 text-xs text-gray-500">
          {helper}
        </p>
      ) : null}
    </fieldset>
  );
}

/** On/off switch with a label and a one-line explanation. */
export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-gray-900">
          {label}
        </p>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={() => onChange(!checked)}
        className="flex h-10 shrink-0 items-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
      >
        <span
          className={clsx(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            checked ? "bg-indigo-600" : "bg-gray-300",
          )}
        >
          <span
            className={clsx(
              "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
              checked ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
    </div>
  );
}

/** Plan types as selectable cards with icons; the first pick is the main focus. */
export function PlanTypePicker({
  selected,
  onChange,
  error,
  id = "plan-types",
}: {
  selected: string[];
  onChange: (values: string[]) => void;
  error?: string;
  id?: string;
}) {
  const hiddenSelected = selected.some((v) => !FEATURED_PLAN_TYPES.includes(v));
  const [showAll, setShowAll] = useState(hiddenSelected);
  const expanded = showAll || hiddenSelected;
  const options = expanded
    ? PLAN_TYPE_OPTIONS.map((o) => o.value as string)
    : FEATURED_PLAN_TYPES;
  const noteId = `${id}-note`;

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={noteId} className="min-w-0 focus:outline-none">
      <legend className="mb-1.5 text-[13px] font-semibold text-gray-700">
        Plan types
        <span className="ml-1 text-red-600" aria-hidden>
          *
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {options.map((value) => {
          const meta = PLAN_TYPE_META[value] ?? { label: planTypeLabel(value), icon: Sparkles };
          const Icon = meta.icon;
          const checked = selected.includes(value);
          const isMain = checked && selected.length > 1 && selected[0] === value;
          return (
            <label key={value} className="relative block min-w-0 cursor-pointer">
              <input type="checkbox" checked={checked} onChange={() => toggle(value)} className="peer sr-only" />
              <span
                className={clsx(
                  "flex h-full min-h-[56px] items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                  "peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-100",
                  checked
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                    : error
                      ? "border-red-300 bg-white hover:bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    checked ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500",
                  )}
                  aria-hidden
                >
                  {checked ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx("block text-sm font-medium leading-snug", checked ? "text-gray-900" : "text-gray-700")}>
                    {meta.label}
                  </span>
                  {isMain && <span className="block text-xs font-medium text-indigo-700">Main focus</span>}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {error ? (
          <p id={noteId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        ) : (
          <p id={noteId} className="text-xs text-gray-500">
            {selected.length === 0
              ? "Pick one or more. The first one you pick is the main focus."
              : `${selected.length} selected. The first one you picked is the main focus.`}
          </p>
        )}
        {!hiddenSelected && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={expanded}
            className="-mr-2 inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            {expanded ? "Show fewer" : `Show all ${PLAN_TYPE_OPTIONS.length} types`}
            <ChevronDown className={clsx("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Field groups shared by every plan builder                            */
/* ------------------------------------------------------------------ */

type Update = (field: keyof PlanFormState, value: any) => void;

/** Step "Plan": what kind of plan, how long, how hard. */
export function PlanBasicsFields({
  form,
  update,
  errors = {},
}: {
  form: PlanFormState;
  update: Update;
  errors?: Record<string, string>;
}) {
  return (
    <>
      <PlanTypePicker selected={form.planTypes} onChange={(v) => update("planTypes", v)} error={errors.planTypes} />
      <ChoiceGroup
        legend="Duration"
        options={DURATION_OPTIONS.map((o) => ({ value: o.value, ...splitDuration(o.label) }))}
        value={form.duration}
        onChange={(v) => update("duration", v)}
        columns="grid-cols-2 sm:grid-cols-3"
        helper="Shorter plans are ready faster."
      />
      <ChoiceGroup
        legend="Intensity"
        options={INTENSITY_OPTIONS.map((o) => ({ value: o.value, ...(INTENSITY_META[o.value] ?? { label: o.label }) }))}
        value={form.intensity}
        onChange={(v) => update("intensity", v)}
        columns="grid-cols-1 sm:grid-cols-3"
      />
    </>
  );
}

/** Step "Preferences": goals, lifestyle, health and output. Everything here is optional. */
export function PreferenceFields({ form, update }: { form: PlanFormState; update: Update }) {
  return (
    <>
      <div className="space-y-4">
        <SubHeading>Goals</SubHeading>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CheckboxDropdown
            label="Main goals"
            helper="What do you want this plan to achieve?"
            placeholder="Choose goals"
            options={GOAL_OPTIONS.map((value) => ({ label: value, value }))}
            selected={form.goals}
            onChange={(values) => update("goals", values)}
          />
          <CheckboxDropdown
            label="Focus areas"
            helper="Areas to give extra attention."
            placeholder="Choose focus areas"
            options={FOCUS_AREA_OPTIONS.map((value) => ({ label: value, value }))}
            selected={form.focusAreas}
            onChange={(values) => update("focusAreas", values)}
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-6">
        <SubHeading>Lifestyle</SubHeading>
        <ChoiceGroup
          legend="Diet"
          options={DIET_OPTIONS.map((value) => ({ value, label: dietLabel(value) }))}
          value={form.dietType}
          onChange={(v) => update("dietType", v)}
          columns="grid-cols-2 sm:grid-cols-4"
        />
        <ChoiceGroup
          legend="Activity level"
          options={ACTIVITY_LEVEL_OPTIONS.map((value) => ({ value, ...(ACTIVITY_META[value] ?? { label: value }) }))}
          value={form.activityLevel}
          onChange={(v) => update("activityLevel", v)}
          columns="grid-cols-2 sm:grid-cols-4"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
          <Field label="Sleep per night (hours)">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              value={form.sleepHours}
              onChange={(e) => update("sleepHours", e.target.value)}
              placeholder="7"
            />
          </Field>
          <ChoiceGroup
            legend="Stress level"
            options={STRESS_OPTIONS}
            value={form.stressLevel}
            onChange={(v) => update("stressLevel", v)}
            columns="grid-cols-3"
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-6">
        <SubHeading>Health</SubHeading>
        <CheckboxDropdown
          label="Health conditions"
          helper="The plan avoids anything unsafe for these. Leave empty if none."
          placeholder="Choose conditions"
          options={CHRONIC_CONDITION_OPTIONS.map((value) => ({ label: value, value }))}
          selected={form.chronicConditions}
          onChange={(values) => update("chronicConditions", values)}
        />
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-6">
        <SubHeading>Output</SubHeading>
        <ChoiceGroup
          legend="Format"
          options={FORMAT_OPTIONS.map((o) => ({ value: o.value, label: FORMAT_META[o.value] ?? o.label }))}
          value={form.format}
          onChange={(v) => update("format", v)}
          columns="grid-cols-1 sm:grid-cols-3"
        />
        <SwitchRow
          label="Include a daily routine"
          description="Wake-up, meal and wind-down times for each day."
          checked={form.includeDailyRoutine === "yes"}
          onChange={(on) => update("includeDailyRoutine", on ? "yes" : "no")}
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Plan configuration without personal details (Custom GPT flows)       */
/* ------------------------------------------------------------------ */

type Props = {
  form: PlanFormState;
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>;
  /** Number of the first step card (the profile step comes before). */
  startStep?: number;
};

export function PlanConfigurator({ form, setForm, startStep = 2 }: Props) {
  const update: Update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <SectionCard
        id="step-plan"
        step={startStep}
        title="Plan"
        description="Choose what the plan covers, how long it runs and how hard it pushes."
        status={form.planTypes.length > 0 ? "complete" : "todo"}
      >
        <PlanBasicsFields form={form} update={update} />
      </SectionCard>
      <SectionCard
        id="step-preferences"
        step={startStep + 1}
        title="Preferences"
        description="Goals, lifestyle and health details make the plan more personal."
        status="optional"
      >
        <PreferenceFields form={form} update={update} />
      </SectionCard>
    </>
  );
}
