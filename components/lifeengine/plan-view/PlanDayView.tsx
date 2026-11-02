"use client";

import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  Flower2,
  Lightbulb,
  Moon,
  Repeat,
  Repeat2,
  Sparkles,
  Target,
  Timer,
  TriangleAlert,
  UtensilsCrossed,
  Wind,
  Wrench,
} from "lucide-react";
import {
  dayNutrition,
  hasContent,
  type ChipKind,
  type Nutrition,
  type ViewChip,
  type ViewDay,
  type ViewExercise,
  type ViewMeal,
  type ViewNote,
  type ViewPose,
} from "./model";

/**
 * "screen" is the interactive reading view. "paper" is the print and PDF
 * layout: black on white, no shadows, every recipe expanded.
 */
export type ViewMode = "screen" | "paper";

const CHIP_ICONS: Record<ChipKind, LucideIcon | null> = {
  time: Clock,
  kcal: Flame,
  sets: Repeat,
  reps: Repeat2,
  rest: Timer,
  portion: UtensilsCrossed,
  text: null,
};

export function Chip({ chip, mode = "screen" }: { chip: ViewChip; mode?: ViewMode }) {
  const Icon = CHIP_ICONS[chip.kind];
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1 text-xs font-medium",
        // Paper skips the pill: html2canvas misplaces text inside small bordered boxes.
        mode === "paper" ? "text-black" : "rounded-full bg-gray-100 px-2.5 py-1 text-gray-700",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />}
      <span className="min-w-0">{chip.text}</span>
    </span>
  );
}

export function ChipRow({ chips, mode, className }: { chips: ViewChip[]; mode?: ViewMode; className?: string }) {
  if (!chips.length) return null;
  return (
    <div className={clsx("flex flex-wrap", mode === "paper" ? "gap-x-4 gap-y-1" : "gap-1.5", className)}>
      {chips.map((chip, i) => (
        <Chip key={`${chip.kind}-${i}`} chip={chip} mode={mode} />
      ))}
    </div>
  );
}

/** Drop a leading "Step 2:" so the visible number is not repeated. */
const cleanStep = (step: string) => step.replace(/^\s*(step\s*)?\d+\s*[:.)\-–]\s*/i, "").trim();
/** AI tips often start with an emoji used as a bullet; the list has its own bullets. */
const cleanTip = (tip: string) => tip.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, "").trim();

export function StepList({ steps, mode = "screen" }: { steps: string[]; mode?: ViewMode }) {
  if (!steps.length) return null;
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className={clsx("flex gap-3 text-sm", mode === "paper" ? "text-black" : "text-gray-700")}>
          {mode === "paper" ? (
            <span aria-hidden className="w-5 shrink-0 text-right font-semibold tabular-nums">
              {i + 1}.
            </span>
          ) : (
            <span
              aria-hidden
              className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold tabular-nums text-indigo-700"
            >
              {i + 1}
            </span>
          )}
          <span className={clsx("min-w-0 flex-1", mode === "paper" ? "leading-5" : "pt-0.5 leading-5")}>{cleanStep(step)}</span>
        </li>
      ))}
    </ol>
  );
}

function BulletList({ items, mode = "screen" }: { items: string[]; mode?: ViewMode }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className={clsx("flex gap-2.5 text-sm", mode === "paper" ? "text-black" : "text-gray-700")}>
          <span aria-hidden className={clsx("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", mode === "paper" ? "bg-black" : "bg-gray-400")} />
          <span className="min-w-0 flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A labelled line of detail: "Breathing — inhale as you rise". */
function Detail({
  icon: Icon,
  label,
  children,
  tone = "default",
  mode = "screen",
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  tone?: "default" | "warn";
  mode?: ViewMode;
}) {
  const paper = mode === "paper";
  return (
    <div className={clsx("flex gap-2.5 text-sm", paper ? "text-black" : "text-gray-700")}>
      <Icon
        className={clsx("mt-0.5 h-4 w-4 shrink-0", paper ? "text-black" : tone === "warn" ? "text-amber-600" : "text-gray-400")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <span className={clsx("font-medium", paper ? "text-black" : "text-gray-900")}>{label}</span>{" "}
        {children}
      </div>
    </div>
  );
}

function SubHeading({ children, mode = "screen" }: { children: ReactNode; mode?: ViewMode }) {
  return (
    <h5 className={clsx("mb-2 text-xs font-semibold uppercase tracking-wider", mode === "paper" ? "text-black" : "text-gray-500")}>
      {children}
    </h5>
  );
}

export function Section({
  id,
  icon: Icon,
  title,
  description,
  chips = [],
  children,
  mode = "screen",
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  chips?: ViewChip[];
  children: ReactNode;
  mode?: ViewMode;
}) {
  const paper = mode === "paper";
  return (
    <section
      aria-labelledby={id}
      className={clsx(paper ? "border-t border-gray-300 pt-5" : "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6")}
    >
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            paper ? "border border-gray-400 text-black" : "bg-indigo-50 text-indigo-600",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={id} className={clsx("text-base font-semibold", paper ? "text-black" : "text-gray-900")}>
            {title}
          </h3>
          {description && <p className={clsx("mt-0.5 text-sm", paper ? "text-gray-800" : "text-gray-500")}>{description}</p>}
          <ChipRow chips={chips} mode={mode} className="mt-2" />
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// ---------- yoga ----------

function PoseItem({ pose, index, mode }: { pose: ViewPose; index: number; mode: ViewMode }) {
  const paper = mode === "paper";
  return (
    <li className={clsx("py-4 first:pt-0 last:pb-0", paper && "break-inside-avoid")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
        <h4 className={clsx("min-w-0 text-sm font-semibold", paper ? "text-black" : "text-gray-900")}>
          <span className={clsx("mr-1.5 tabular-nums", paper ? "text-gray-700" : "text-gray-400")}>{index + 1}.</span>
          {pose.name}
        </h4>
        <ChipRow chips={pose.chips} mode={mode} />
      </div>
      <div className="mt-3 space-y-3">
        {pose.description && <p className={clsx("text-sm", paper ? "text-black" : "text-gray-700")}>{pose.description}</p>}
        {pose.benefits && (
          <Detail icon={Sparkles} label="Benefits" mode={mode}>
            {pose.benefits}
          </Detail>
        )}
        {pose.focus && (
          <Detail icon={Target} label="Focus" mode={mode}>
            {pose.focus}
          </Detail>
        )}
        <StepList steps={pose.steps} mode={mode} />
        {pose.breathing && (
          <Detail icon={Wind} label="Breathing" mode={mode}>
            {pose.breathing}
          </Detail>
        )}
        {pose.modifications && (
          <Detail icon={Wrench} label="Modifications" mode={mode}>
            {pose.modifications}
          </Detail>
        )}
        {pose.avoid.length > 0 && (
          <Detail icon={TriangleAlert} label="Avoid" tone="warn" mode={mode}>
            {pose.avoid.join("; ")}
          </Detail>
        )}
      </div>
    </li>
  );
}

// ---------- training ----------

function ExerciseItem({ exercise, mode }: { exercise: ViewExercise; mode: ViewMode }) {
  const paper = mode === "paper";
  return (
    <li className={clsx("rounded-xl border p-4", paper ? "break-inside-avoid border-gray-300" : "border-gray-200")}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h4 className={clsx("text-sm font-semibold", paper ? "text-black" : "text-gray-900")}>{exercise.name}</h4>
          {exercise.type && <p className={clsx("text-xs", paper ? "text-gray-800" : "text-gray-500")}>{exercise.type}</p>}
        </div>
      </div>
      <ChipRow chips={exercise.chips} mode={mode} className="mt-3" />
      <div className="mt-3 space-y-3">
        {exercise.muscles.length > 0 && (
          <Detail icon={Target} label="Works" mode={mode}>
            {exercise.muscles.join(", ")}
          </Detail>
        )}
        {exercise.description && <p className={clsx("text-sm", paper ? "text-black" : "text-gray-700")}>{exercise.description}</p>}
        {exercise.steps.length > 0 && (
          <div>
            <SubHeading mode={mode}>How to do it</SubHeading>
            <StepList steps={exercise.steps} mode={mode} />
          </div>
        )}
        {exercise.formCues.length > 0 && (
          <div>
            <SubHeading mode={mode}>Form cues</SubHeading>
            <BulletList items={exercise.formCues} mode={mode} />
          </div>
        )}
        {exercise.tips.length > 0 && (
          <div>
            <SubHeading mode={mode}>Tips</SubHeading>
            <BulletList items={exercise.tips} mode={mode} />
          </div>
        )}
        {exercise.avoid.length > 0 && (
          <Detail icon={TriangleAlert} label="Avoid" tone="warn" mode={mode}>
            {exercise.avoid.join("; ")}
          </Detail>
        )}
        {exercise.progress && (
          <Detail icon={ArrowUpRight} label="Make it harder" mode={mode}>
            {exercise.progress}
          </Detail>
        )}
        {exercise.regress && (
          <Detail icon={ArrowDownRight} label="Make it easier" mode={mode}>
            {exercise.regress}
          </Detail>
        )}
      </div>
    </li>
  );
}

// ---------- meals ----------

const MACROS: { key: keyof Nutrition; label: string; unit: string }[] = [
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fibre", unit: "g" },
];

function MacroRow({ nutrition, mode }: { nutrition: Nutrition; mode: ViewMode }) {
  const items = MACROS.filter((m) => typeof nutrition[m.key] === "number");
  if (!items.length) return null;
  const paper = mode === "paper";
  return (
    <dl className="grid grid-cols-4 gap-2">
      {items.map((m) => (
        <div key={m.key} className={clsx("rounded-lg px-2 py-1.5 text-center", paper ? "border border-gray-300" : "bg-gray-50")}>
          <dt className={clsx("text-[11px] font-medium", paper ? "text-gray-800" : "text-gray-500")}>{m.label}</dt>
          <dd className={clsx("text-sm font-semibold tabular-nums", paper ? "text-black" : "text-gray-900")}>
            {Math.round(nutrition[m.key] as number)}
            <span className="ml-0.5 text-xs font-normal">{m.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RecipeBody({ meal, mode }: { meal: ViewMeal; mode: ViewMode }) {
  return (
    <div className="space-y-4">
      {meal.ingredients.length > 0 && (
        <div>
          <SubHeading mode={mode}>Ingredients</SubHeading>
          <BulletList items={meal.ingredients} mode={mode} />
        </div>
      )}
      {meal.steps.length > 0 && (
        <div>
          <SubHeading mode={mode}>Method</SubHeading>
          <StepList steps={meal.steps} mode={mode} />
        </div>
      )}
    </div>
  );
}

/** Recipe disclosure. The body is only rendered while open, so closed recipes cost nothing. */
function RecipeToggle({ meal, summary }: { meal: ViewMeal; summary: string }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
      >
        <span className="min-w-0">
          {open ? "Hide recipe" : "Show recipe"}
          {summary && <span className="ml-2 font-normal text-gray-500">{summary}</span>}
        </span>
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-gray-500 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={bodyId} className="border-t border-gray-200 p-3">
          <RecipeBody meal={meal} mode="screen" />
        </div>
      )}
    </div>
  );
}

function MealCard({ meal, mode }: { meal: ViewMeal; mode: ViewMode }) {
  const paper = mode === "paper";
  const hasRecipe = meal.ingredients.length > 0 || meal.steps.length > 0;
  const recipeSummary = [
    meal.ingredients.length ? `${meal.ingredients.length} ingredients` : null,
    meal.steps.length ? `${meal.steps.length} steps` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className={clsx("flex flex-col rounded-xl border p-4", paper ? "break-inside-avoid border-gray-300" : "border-gray-200")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={clsx("text-xs font-semibold uppercase tracking-wider", paper ? "text-gray-800" : "text-gray-500")}>{meal.label}</p>
          <h4 className={clsx("mt-0.5 text-sm font-semibold", paper ? "text-black" : "text-gray-900")}>{meal.title}</h4>
        </div>
        {typeof meal.nutrition.calories === "number" && (
          <p className={clsx("shrink-0 text-sm font-semibold tabular-nums", paper ? "text-black" : "text-gray-900")}>
            {Math.round(meal.nutrition.calories)}
            <span className={clsx("ml-1 text-xs font-normal", paper ? "text-gray-800" : "text-gray-500")}>kcal</span>
          </p>
        )}
      </div>
      <ChipRow chips={meal.chips} mode={mode} className="mt-3" />
      <div className="mt-3 space-y-3">
        <MacroRow nutrition={meal.nutrition} mode={mode} />
        {meal.description && (
          <p className={clsx("whitespace-pre-line text-sm", paper ? "text-black" : "text-gray-700")}>{meal.description}</p>
        )}
        {hasRecipe &&
          (paper ? (
            <RecipeBody meal={meal} mode={mode} />
          ) : (
            <RecipeToggle meal={meal} summary={recipeSummary} />
          ))}
        {meal.notes && (
          <Detail icon={Lightbulb} label="Note" mode={mode}>
            {meal.notes}
          </Detail>
        )}
        {meal.swap && (
          <Detail icon={Repeat2} label="Swap" mode={mode}>
            {meal.swap}
          </Detail>
        )}
      </div>
    </li>
  );
}

function NutritionTotals({ nutrition, mode }: { nutrition: Nutrition; mode: ViewMode }) {
  const items = [
    { key: "calories" as const, label: "Calories", unit: "kcal" },
    ...MACROS,
  ].filter((m) => typeof nutrition[m.key] === "number");
  if (items.length < 2) return null;
  const paper = mode === "paper";
  return (
    <dl
      className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-5"
      aria-label="Day totals"
    >
      {items.map((m) => (
        <div key={m.key} className={clsx("rounded-xl px-3 py-2.5", paper ? "border border-gray-300" : "bg-gray-50")}>
          <dt className={clsx("text-xs font-medium", paper ? "text-gray-800" : "text-gray-500")}>{m.label}</dt>
          <dd className={clsx("text-base font-semibold tabular-nums", paper ? "text-black" : "text-gray-900")}>
            {Math.round(nutrition[m.key] as number).toLocaleString("en-IN")}
            <span className="ml-1 text-xs font-normal text-gray-500">{m.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ---------- tips ----------

function TipList({ tips, mode }: { tips: ViewNote[]; mode: ViewMode }) {
  const paper = mode === "paper";
  return (
    <ul className="space-y-2.5">
      {tips.map((tip, i) => (
        <li key={i} className={clsx("flex gap-3 text-sm", paper ? "text-black" : "text-gray-700")}>
          <span aria-hidden className={clsx("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", paper ? "bg-black" : "bg-indigo-400")} />
          <span className="min-w-0 flex-1">
            {tip.label && <span className={clsx("font-medium", paper ? "text-black" : "text-gray-900")}>{tip.label}: </span>}
            {cleanTip(tip.text)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------- the day ----------

/** Count chips shown under the day title: "4 poses · 3 exercises · 1,640 kcal". */
export function daySummary(day: ViewDay): ViewChip[] {
  const out: ViewChip[] = [];
  if (day.yoga) {
    const minutes = day.yoga.chips.find((c) => c.kind === "time")?.text.match(/^\d+/)?.[0];
    const poses = day.yoga.poses.length > 1 ? ` · ${day.yoga.poses.length} poses` : "";
    out.push(minutes ? { kind: "time", text: `${minutes} min yoga${poses}` } : { kind: "text", text: `Yoga${poses}` });
  }
  if (day.exercises.length) out.push({ kind: "text", text: `${day.exercises.length} ${day.exercises.length === 1 ? "exercise" : "exercises"}` });
  if (day.meals.length) out.push({ kind: "text", text: `${day.meals.length} ${day.meals.length === 1 ? "meal" : "meals"}` });
  const kcal = dayNutrition(day.meals).calories;
  if (kcal) out.push({ kind: "kcal", text: `${Math.round(kcal).toLocaleString("en-IN")} kcal` });
  return out;
}

export function DayTitle({
  day,
  mode = "screen",
  headingId,
  actions,
}: {
  day: ViewDay;
  mode?: ViewMode;
  headingId?: string;
  actions?: ReactNode;
}) {
  const paper = mode === "paper";
  return (
    <div className={clsx("flex items-start justify-between gap-3", paper && "border-b-2 border-black pb-3")}>
      <div className="min-w-0">
        {day.sublabel && <p className={clsx("text-sm font-medium", paper ? "text-gray-800" : "text-gray-500")}>{day.sublabel}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <h2 id={headingId} className={clsx("text-xl font-semibold tracking-tight sm:text-2xl", paper ? "text-black" : "text-gray-900")}>
            {day.label}
          </h2>
          {day.isToday && !paper && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">Today</span>
          )}
          {day.restDay && (
            <span
              className={clsx(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                paper ? "text-black" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
              )}
            >
              <Moon className="h-3 w-3" aria-hidden />
              Rest day
            </span>
          )}
        </div>
        <ChipRow chips={daySummary(day)} mode={mode} className="mt-3" />
      </div>
      {actions}
    </div>
  );
}

export function PlanDayView({
  day,
  idPrefix,
  mode = "screen",
  titleActions,
  headingId,
}: {
  day: ViewDay;
  idPrefix: string;
  mode?: ViewMode;
  titleActions?: ReactNode;
  headingId?: string;
}) {
  const paper = mode === "paper";
  const totals = dayNutrition(day.meals);

  return (
    <div className={clsx(paper ? "space-y-5 bg-white text-black" : "space-y-4 sm:space-y-6")}>
      <DayTitle day={day} mode={mode} headingId={headingId} actions={titleActions} />

      {day.note && (
        <p
          className={clsx(
            "text-sm",
            paper ? "text-black" : "rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-gray-700",
          )}
        >
          {day.note}
        </p>
      )}

      {!hasContent(day) && (
        <p className={clsx("text-sm", paper ? "text-black" : "rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-gray-600")}>
          Nothing is scheduled for this day. Rest, stay hydrated and move gently.
        </p>
      )}

      {day.yoga && (
        <Section
          id={`${idPrefix}-yoga`}
          icon={Flower2}
          title="Yoga"
          description={day.yoga.title}
          chips={day.yoga.chips}
          mode={mode}
        >
          {day.yoga.description && <p className="mb-4 text-sm text-gray-700">{day.yoga.description}</p>}
          {day.yoga.poses.length > 0 && (
            <ol className={clsx("divide-y", paper ? "divide-gray-300" : "divide-gray-100")}>
              {day.yoga.poses.map((pose, i) => (
                <PoseItem key={i} pose={pose} index={i} mode={mode} />
              ))}
            </ol>
          )}
          {day.yoga.notes.length > 0 && (
            <div className={clsx("mt-5 space-y-2 border-t pt-4", paper ? "border-gray-300" : "border-gray-100")}>
              {day.yoga.notes.map((note, i) => (
                <Detail key={i} icon={note.label === "Breathwork" ? Wind : Lightbulb} label={note.label ?? "Note"} mode={mode}>
                  {note.text}
                </Detail>
              ))}
            </div>
          )}
        </Section>
      )}

      {day.exercises.length > 0 && (
        <Section
          id={`${idPrefix}-training`}
          icon={Dumbbell}
          title="Training"
          description={`${day.exercises.length} ${day.exercises.length === 1 ? "exercise" : "exercises"}`}
          mode={mode}
        >
          <ol className="space-y-3">
            {day.exercises.map((exercise, i) => (
              <ExerciseItem key={i} exercise={exercise} mode={mode} />
            ))}
          </ol>
        </Section>
      )}

      {day.meals.length > 0 && (
        <Section
          id={`${idPrefix}-meals`}
          icon={UtensilsCrossed}
          title="Meals and recipes"
          description={`${day.meals.length} ${day.meals.length === 1 ? "meal" : "meals"}`}
          mode={mode}
        >
          <NutritionTotals nutrition={totals} mode={mode} />
          <ul className={clsx("grid gap-3", !paper && "xl:grid-cols-2 xl:items-start")}>
            {day.meals.map((meal, i) => (
              <MealCard key={i} meal={meal} mode={mode} />
            ))}
          </ul>
        </Section>
      )}

      {day.tips.length > 0 && (
        <Section id={`${idPrefix}-tips`} icon={Lightbulb} title="Tips for the day" mode={mode}>
          <TipList tips={day.tips} mode={mode} />
        </Section>
      )}
    </div>
  );
}
