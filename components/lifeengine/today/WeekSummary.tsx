"use client";

import clsx from "clsx";
import { BedDouble, Target } from "lucide-react";
import { HEAT_SHADES, formatDay, formatNarrowDay } from "@/components/lifeengine/habits/palette";
import { addDays, dayTotals, heatLevel, overallWeekCompletion } from "@/lib/habits/logic";
import type { Habit } from "@/lib/habits/types";
import { computeInsights, formatDuration } from "@/lib/sleep/logic";
import type { SleepState } from "@/lib/sleep/types";
import { CardHeader, cardClass } from "./ui";

/** Habit completion and average sleep over the last 7 days. */
export function WeekSummary({ habits, sleep, today }: { habits: Habit[]; sleep: SleepState; today: string }) {
  const completion = overallWeekCompletion(habits, today);
  const s = computeInsights(sleep.entries, { today, days: 7, goalMinutes: sleep.goalMinutes });
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <section aria-labelledby="week-title" className={cardClass}>
      <CardHeader id="week-title" title="This week" description="The last 7 days." />
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
            <Target className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
            Habits
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{completion === null ? "–" : `${Math.round(completion * 100)}%`}</dd>
          <dd className="text-xs text-gray-500">{completion === null ? "No habits yet" : "Completion"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
            <BedDouble className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
            Sleep
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{s.nights ? formatDuration(s.avgMinutes) : "–"}</dd>
          <dd className="text-xs text-gray-500">
            {s.nights ? `Average of ${s.nights} ${s.nights === 1 ? "night" : "nights"}` : "No nights logged"}
          </dd>
        </div>
      </dl>
      {habits.length > 0 ? (
        <ol className="mt-5 grid grid-cols-7 gap-1" aria-label="Habits done each day, last 7 days">
          {days.map((d) => {
            const t = dayTotals(habits, d);
            const ratio = t.total ? t.done / t.total : 0;
            return (
              <li key={d} className="flex flex-col items-center gap-1.5">
                <span
                  className={clsx("h-7 w-full max-w-[2.25rem] rounded-md", ratio > 0 ? HEAT_SHADES[heatLevel(ratio)] : "bg-gray-100 ring-1 ring-inset ring-gray-200")}
                  aria-hidden
                />
                <span className={clsx("text-[11px] leading-none", d === today ? "font-semibold text-gray-900" : "text-gray-500")} aria-hidden>
                  {formatNarrowDay(d)}
                </span>
                <span className="sr-only">
                  {formatDay(d)}: {t.total ? `${t.done} of ${t.total} done` : "no habits"}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
