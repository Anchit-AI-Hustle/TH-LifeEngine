"use client";

import { createContext, useContext } from "react";
import clsx from "clsx";
import { Check, CircleCheck } from "lucide-react";
import { DAY_DONE, type DayProgress } from "@/lib/planProgress/store";
import type { ViewDay } from "./model";

/** Session ids for a day: one per yoga block, training block and meal. */
export function dayItemIds(day: ViewDay): string[] {
  const ids: string[] = [];
  if (day.yoga) ids.push("yoga");
  if (day.exercises.length) ids.push("training");
  day.meals.forEach((_, i) => ids.push(`meal-${i}`));
  return ids;
}

/** Plan ids from the plan pages' own URLs, so their progress works without extra wiring. */
export function planIdFromPath(pathname: string | null): string | null {
  const match = /^\/(?:lifeengine|custom-gpt)\/plan\/([^/?#]+)/.exec(pathname ?? "");
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export type DayProgressContextValue = {
  dayIndex: number;
  done: DayProgress;
  setItemDone: (itemId: string, done: boolean, allItemIds: string[]) => void;
  setDayDone: (done: boolean, allItemIds: string[]) => void;
};

/** Present only inside a PlanReader that tracks progress (never on paper). */
export const DayProgressContext = createContext<DayProgressContextValue | null>(null);

export function useDayProgress() {
  return useContext(DayProgressContext);
}

export function isDone(done: DayProgress | undefined, itemId: string) {
  return Boolean(done?.[itemId]);
}

export function dayIsDone(done: DayProgress | undefined) {
  return Boolean(done?.[DAY_DONE]);
}

/** The per-session tick. A real toggle button so it reads "pressed" to screen readers. */
export function DoneToggle({
  done,
  onChange,
  label,
  className,
}: {
  done: boolean;
  onChange: (done: boolean) => void;
  /** What is being ticked, for screen readers: "Yoga", "Breakfast". */
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={`${label}: ${done ? "done" : "mark as done"}`}
      onClick={() => onChange(!done)}
      className={clsx(
        "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 print:hidden",
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        className,
      )}
    >
      {done ? (
        <CircleCheck className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" aria-hidden />
      )}
      {done ? "Done" : "Mark done"}
    </button>
  );
}

/** "2 of 5 done" with a bar, and the whole-day toggle. */
export function DayProgressBar({ day }: { day: ViewDay }) {
  const ctx = useDayProgress();
  if (!ctx) return null;
  const ids = dayItemIds(day);
  const doneCount = ids.filter((id) => ctx.done[id]).length;
  const dayDone = dayIsDone(ctx.done);
  const pct = ids.length ? Math.round((doneCount / ids.length) * 100) : dayDone ? 100 : 0;
  const summary = ids.length
    ? `${doneCount} of ${ids.length} done`
    : dayDone
      ? "Day done"
      : "Nothing to tick today";

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between print:hidden",
        dayDone ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-white",
      )}
    >
      <div className="min-w-0 flex-1">
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {dayDone && <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />}
          <span className="tabular-nums">{summary}</span>
          {dayDone && ids.length > 0 && <span className="font-normal text-emerald-700">· day complete</span>}
        </p>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label="Day progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button
        type="button"
        aria-pressed={dayDone}
        onClick={() => ctx.setDayDone(!dayDone, ids)}
        title={dayDone ? "Select to mark the day as not done" : undefined}
        className={clsx(
          "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
          dayDone
            ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
            : "bg-gray-900 text-white hover:bg-gray-800",
        )}
      >
        <Check className="h-4 w-4" aria-hidden />
        {dayDone ? "Day done" : "Mark day done"}
      </button>
    </div>
  );
}
