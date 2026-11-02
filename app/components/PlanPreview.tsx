"use client";

import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import type { LifeEnginePlan } from "@/app/types/lifeengine";
import { daysFromWeeklySchedule } from "@/components/lifeengine/plan-view/model";
import { PlanDayView } from "@/components/lifeengine/plan-view/PlanDayView";
import { PlanReader } from "@/components/lifeengine/plan-view/PlanReader";
import { PlanExtras, PlanSummaryCard } from "@/components/lifeengine/plan-view/PlanOverview";

interface PlanPreviewProps {
  plan: LifeEnginePlan | null;
}

type ViewChoice = "day" | "week";

/**
 * A Custom GPT plan inside another page (chat, Custom GPT). Same reading view
 * as the plan page: read it day by day, or switch to the full week, which is
 * also what the host page's PDF download captures.
 */
export default function PlanPreview({ plan }: PlanPreviewProps) {
  const [view, setView] = useState<ViewChoice>("day");
  const uid = useId().replace(/:/g, "");
  const days = useMemo(() => daysFromWeeklySchedule(plan?.weekly_schedule), [plan]);
  const items = useMemo(() => days.map(({ label, sublabel, short, isToday }) => ({ label, sublabel, short, isToday })), [days]);

  if (!plan) return null;

  return (
    <div className="space-y-6">
      <PlanSummaryCard plan={plan} />

      {days.length > 0 ? (
        <section aria-labelledby={`${uid}-schedule`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id={`${uid}-schedule`} className="text-base font-semibold text-gray-900">
                Weekly schedule
              </h3>
              <p className="text-sm text-gray-500">
                {days.length} {days.length === 1 ? "day" : "days"} of practice, training and meals
              </p>
            </div>
            <div role="radiogroup" aria-label="Show" className="inline-grid grid-flow-col rounded-xl bg-gray-100 p-1">
              {(
                [
                  ["day", "By day"],
                  ["week", "Full week"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={view === value}
                  onClick={() => setView(value)}
                  className={clsx(
                    "min-h-[40px] rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
                    view === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {view === "day" ? (
            <PlanReader
              items={items}
              idPrefix={`${uid}-preview`}
              layout="horizontal"
              sticky={false}
              renderDay={(index, { headingId, stepper }) => (
                <PlanDayView day={days[index]} idPrefix={`${uid}-d${index}`} headingId={headingId} titleActions={stepper} />
              )}
            />
          ) : (
            <div className="space-y-10">
              {days.map((day, index) => (
                <PlanDayView key={index} day={day} idPrefix={`${uid}-w${index}`} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
          This plan does not include a day-by-day schedule.
        </p>
      )}

      <PlanExtras plan={plan} />
    </div>
  );
}
