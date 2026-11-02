"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, LoaderCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  repsLabel,
  setsLabel,
  type ViewChip,
  type ViewDay,
  type ViewMeal,
} from "@/components/lifeengine/plan-view/model";
import { PlanDayView } from "@/components/lifeengine/plan-view/PlanDayView";
import { PlanReader } from "@/components/lifeengine/plan-view/PlanReader";
import { ExportStatusLine, PlanExportPanel, usePdfExport } from "@/components/lifeengine/plan-view/PlanExport";
import { PlanPrintStyles, PrintPages } from "@/components/lifeengine/plan-view/PlanPrint";
import { safeFileName } from "@/components/lifeengine/plan-view/exportPdf";

// Type definitions for the notebook structure
export interface YogaPose {
  name: string;
  duration: string;
  steps: string[];
  breathing?: string;
  benefits?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  tips: string[];
  formCues?: string[];
}

export interface Meal {
  name: string;
  recipe: string;
  ingredients: string[];
  portions: string;
  macros?: {
    calories: number;
    protein: string;
    carbs: string;
    fats: string;
  };
  prepTime?: string;
}

export interface DayPlan {
  day: number;
  /** Short theme shown with the day: "Active recovery". */
  theme?: string;
  yoga?: YogaPose[];
  exercise?: Exercise[];
  meals?: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
    snacks?: Meal[];
  };
  tips?: string[];
  notes?: string;
}

export interface PlanNotebookData {
  planId?: string;
  planName: string;
  userName: string;
  duration: number;
  planTypes: string[];
  createdAt?: string;
  plan: DayPlan[];
}

interface PlanNotebookProps {
  data: PlanNotebookData;
  onClose?: () => void;
}

const EXPORT_PANEL_ID = "notebook-export";

const toNumber = (value?: string | number) => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Split a prose recipe into numbered steps, one per sentence. */
function recipeSteps(recipe?: string) {
  if (!recipe) return [];
  return recipe
    .replace(/\s*\n\s*/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((step) => step.trim())
    .filter(Boolean);
}

function toViewMeal(label: string, meal?: Meal): ViewMeal | null {
  if (!meal) return null;
  const chips: ViewChip[] = [];
  if (meal.prepTime) chips.push({ kind: "time", text: `Prep ${meal.prepTime}` });
  if (meal.portions) chips.push({ kind: "portion", text: meal.portions });
  return {
    label,
    title: meal.name,
    chips,
    nutrition: {
      calories: toNumber(meal.macros?.calories),
      protein: toNumber(meal.macros?.protein),
      carbs: toNumber(meal.macros?.carbs),
      fat: toNumber(meal.macros?.fats),
    },
    ingredients: meal.ingredients ?? [],
    steps: recipeSteps(meal.recipe),
  };
}

function toViewDay(day: DayPlan): ViewDay {
  const poses = day.yoga ?? [];
  const yogaMinutes = poses.reduce((sum, pose) => sum + (toNumber(pose.duration) ?? 0), 0);
  const meals = [
    toViewMeal("Breakfast", day.meals?.breakfast),
    toViewMeal("Lunch", day.meals?.lunch),
    ...(day.meals?.snacks ?? []).map((snack, i, all) => toViewMeal(all.length > 1 ? `Snack ${i + 1}` : "Snack", snack)),
    toViewMeal("Dinner", day.meals?.dinner),
  ].filter(Boolean) as ViewMeal[];

  return {
    label: `Day ${day.day}`,
    sublabel: day.theme,
    short: day.theme,
    note: day.notes,
    yoga: poses.length
      ? {
          chips: yogaMinutes ? [{ kind: "time", text: `${yogaMinutes} min total` }] : [],
          poses: poses.map((pose) => ({
            name: pose.name,
            chips: pose.duration ? [{ kind: "time", text: pose.duration }] : [],
            benefits: pose.benefits,
            steps: pose.steps ?? [],
            breathing: pose.breathing,
            avoid: [],
          })),
          notes: [],
        }
      : null,
    exercises: (day.exercise ?? []).map((ex) => ({
      name: ex.name,
      chips: [
        setsLabel(ex.sets) && { kind: "sets" as const, text: setsLabel(ex.sets)! },
        repsLabel(ex.reps) && { kind: "reps" as const, text: repsLabel(ex.reps)! },
        ex.rest && { kind: "rest" as const, text: `Rest ${ex.rest}` },
      ].filter(Boolean) as ViewChip[],
      muscles: [],
      steps: [],
      formCues: ex.formCues ?? [],
      avoid: [],
      tips: ex.tips ?? [],
    })),
    meals,
    tips: (day.tips ?? []).map((text) => ({ text })),
  };
}

/** Full-page reader for a notebook-style plan (used by the plan demo). */
export default function PlanNotebook({ data, onClose }: PlanNotebookProps) {
  const days = useMemo(() => data.plan.map(toViewDay), [data.plan]);
  const items = useMemo(() => days.map(({ label, sublabel, short }) => ({ label, sublabel, short })), [days]);
  const [currentDay, setCurrentDay] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  const renderPaperDay = useCallback(
    (index: number) => days[index] && <PlanDayView day={days[index]} idPrefix={`nb-paper-${index}`} mode="paper" />,
    [days],
  );

  const pdf = usePdfExport({
    fileName: (indices) =>
      `${safeFileName(data.planName)}_${indices.length === 1 ? `Day_${data.plan[indices[0]]?.day ?? indices[0] + 1}` : "Full_Plan"}.pdf`,
    renderPage: renderPaperDay,
  });

  const description = [
    data.userName ? `For ${data.userName}` : null,
    `${days.length} ${days.length === 1 ? "day" : "days"}`,
    data.planTypes.length ? data.planTypes.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PlanPrintStyles />
      <div className="print:hidden">
        <PageHeader
          title={data.planName}
          description={description}
          actions={
            <>
              <Button
                ref={exportButtonRef}
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                aria-expanded={exportOpen}
                aria-controls={EXPORT_PANEL_ID}
              >
                {pdf.busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                Export PDF
              </Button>
              <Button type="button" variant="ghost" onClick={() => window.print()}>
                <Printer aria-hidden />
                Print
              </Button>
              {onClose && (
                <Button type="button" variant="ghost" onClick={onClose}>
                  <ArrowLeft aria-hidden />
                  Back
                </Button>
              )}
            </>
          }
        />

        {!exportOpen && pdf.status.kind !== "idle" && (
          <div className="-mt-3 mb-6">
            <ExportStatusLine status={pdf.status} />
          </div>
        )}

        {exportOpen && (
          <PlanExportPanel
            id={EXPORT_PANEL_ID}
            items={items}
            current={currentDay}
            status={pdf.status}
            onDownload={pdf.exportDays}
            onClose={() => {
              setExportOpen(false);
              exportButtonRef.current?.focus();
            }}
          />
        )}

        <PlanReader
          items={items}
          idPrefix="notebook"
          progressId={data.planId ?? null}
          onChange={setCurrentDay}
          renderDay={(index, { headingId, stepper }) => (
            <PlanDayView day={days[index]} idPrefix={`nb-day-${index}`} headingId={headingId} titleActions={stepper} />
          )}
        />
      </div>

      <PrintPages title={data.planName} subtitle={description} count={days.length} renderPage={renderPaperDay} />
      {pdf.host}
    </>
  );
}
