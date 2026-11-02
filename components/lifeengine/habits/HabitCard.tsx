"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { Archive, Check, ChevronDown, Clock, Flame, Flag, Pencil, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  activeChallenge,
  challengeProgress,
  doneThisWeek,
  habitStreaks,
  heatmapSummary,
  heatmapWeeks,
  lastNDays,
  targetLabel,
  weekCompletion,
} from "@/lib/habits/logic";
import type { Habit } from "@/lib/habits/types";
import { Heatmap } from "./Heatmap";
import { ProgressRing } from "./ProgressRing";
import { HABIT_COLORS, HABIT_HEAT, HABIT_ICONS, formatDay, formatNarrowDay } from "./palette";

export type HabitActions = {
  onToggle: (habit: Habit, day: string) => void;
  onEdit: (habit: Habit) => void;
  onArchive: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  onStartChallenge: (habit: Habit) => void;
  onEndChallenge: (habit: Habit, status: "completed" | "stopped") => void;
};

function unitLabel(n: number, unit: "day" | "week") {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export function HabitCard({ habit, today, actions }: { habit: Habit; today: string; actions: HabitActions }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "delete" | "stop">(null);
  const detailsId = useId();
  const color = HABIT_COLORS[habit.color];
  const Icon = HABIT_ICONS[habit.icon].icon;
  const doneToday = habit.done.includes(today);
  const streaks = habitStreaks(habit, today);
  const days = lastNDays(habit, today, 7);
  const rate = weekCompletion(habit, today);
  const challenge = activeChallenge(habit);
  const progress = challenge ? challengeProgress(challenge, habit.done, today) : null;
  const completedChallenges = habit.challenges.filter((c) => c.status === "completed").length;
  const weekDone = doneThisWeek(habit, today);

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          aria-pressed={doneToday}
          aria-label={`${habit.name}, done today`}
          onClick={() => actions.onToggle(habit, today)}
          className={clsx(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
            doneToday ? `${color.solid} ${color.border}` : `border-gray-200 bg-white ${color.text} hover:border-gray-300`,
          )}
        >
          <span className={clsx("absolute transition-all duration-200", doneToday ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
            <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </span>
          <span className={clsx("transition-all duration-200", doneToday ? "scale-50 opacity-0" : "scale-100 opacity-100")}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <p className={clsx("break-words text-sm font-semibold sm:text-base", doneToday ? "text-gray-500" : "text-gray-900")}>
            {habit.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span>{targetLabel(habit.target)}</span>
            {habit.reminder ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                <span className="break-words">{habit.reminder}</span>
              </span>
            ) : null}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-gray-900">
            <Flame className={clsx("h-4 w-4", streaks.current > 0 ? "text-amber-500" : "text-gray-300")} aria-hidden />
            {streaks.current}
          </p>
          <p className="text-xs text-gray-500">{streaks.unit === "day" ? "day" : "week"} streak</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <ol className="flex gap-0.5" aria-label={`${habit.name}, last 7 days`}>
          {days.map((d) => (
            <li key={d.date}>
              <button
                type="button"
                aria-pressed={d.done}
                aria-label={`${habit.name}, ${formatDay(d.date)}${d.isToday ? " (today)" : ""}`}
                onClick={() => actions.onToggle(habit, d.date)}
                className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-lg hover:bg-gray-50"
              >
                <span className={clsx("text-[10px] leading-none", d.isToday ? "font-semibold text-gray-900" : "text-gray-500")} aria-hidden>
                  {formatNarrowDay(d.date)}
                </span>
                <span
                  aria-hidden
                  className={clsx(
                    "h-4 w-4 rounded-full transition-colors duration-200",
                    d.done ? color.swatch : d.beforeStart ? "bg-gray-50 ring-1 ring-inset ring-gray-100" : "bg-gray-100",
                    d.isToday && "ring-2 ring-gray-300 ring-offset-1",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
        <p className="pb-1 text-xs text-gray-500">
          {habit.target.kind === "weekly" ? (
            <>
              <span className="font-semibold tabular-nums text-gray-900">
                {weekDone}/{habit.target.perWeek}
              </span>{" "}
              this week
            </>
          ) : (
            <>
              <span className="font-semibold tabular-nums text-gray-900">{Math.round(rate * 100)}%</span> last 7 days
            </>
          )}
        </p>
      </div>

      {challenge && progress ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
          <ProgressRing
            value={progress.ratio}
            size={40}
            stroke={4}
            strokeClass={color.stroke}
            label={`21-day challenge: ${progress.doneCount} of ${progress.length} days done`}
            center={String(progress.doneCount)}
            centerSize={12}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              Day {progress.day} of {progress.length}
            </p>
            <p className="text-xs text-gray-500">
              {progress.doneCount} done{progress.missed > 0 ? ` · ${progress.missed} missed` : ""}
            </p>
          </div>
          {progress.windowOver || progress.perfect ? (
            <Button onClick={() => actions.onEndChallenge(habit, "completed")}>
              <Trophy className="h-4 w-4" aria-hidden />
              Mark complete
            </Button>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => {
          setOpen(!open);
          setConfirm(null);
        }}
        className="mt-2 -mb-1 inline-flex min-h-[40px] items-center gap-1 rounded-lg px-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        {open ? "Hide details" : "Details"}
        <ChevronDown className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div id={detailsId} className="mt-3 space-y-5 border-t border-gray-100 pt-4">
          <dl className="grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs text-gray-500">Current streak</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">{unitLabel(streaks.current, streaks.unit)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Best streak</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">{unitLabel(streaks.best, streaks.unit)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Check-ins</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">{habit.done.length}</dd>
            </div>
          </dl>

          <HabitHistory habit={habit} today={today} />

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
              21-day challenge
            </p>
            {challenge && progress ? (
              confirm === "stop" ? (
                <div className="mt-3 flex flex-col gap-3 rounded-lg bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
                  <p className="text-sm text-amber-900">Stop this challenge? Your check-ins are kept.</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setConfirm(null)}>
                      Keep going
                    </Button>
                    <Button
                     
                      variant="danger"
                      onClick={() => {
                        setConfirm(null);
                        actions.onEndChallenge(habit, "stopped");
                      }}
                    >
                      Stop challenge
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm text-gray-600">
                    Started {formatDay(challenge.start)}. Tick it off every day for 21 days.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => actions.onEndChallenge(habit, "completed")}>
                      <Flag className="h-4 w-4" aria-hidden />
                      Mark complete
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirm("stop")}>
                      Stop
                    </Button>
                  </div>
                </>
              )
            ) : (
              <>
                <p className="mt-1 text-sm text-gray-600">
                  {completedChallenges > 0
                    ? `Completed ${completedChallenges} ${completedChallenges === 1 ? "time" : "times"}. Ready for another round?`
                    : "Commit to 21 days in a row. Missed days are shown, not punished."}
                </p>
                <Button variant="ghost" className="mt-3" onClick={() => actions.onStartChallenge(habit)}>
                  Start 21-day challenge
                </Button>
              </>
            )}
          </div>

          {confirm === "delete" ? (
            <div className="flex flex-col gap-3 rounded-xl bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="text-sm font-medium text-red-800">Delete &ldquo;{habit.name}&rdquo; and all its history? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => actions.onDelete(habit)}>
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => actions.onEdit(habit)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edit
              </Button>
              <Button variant="ghost" onClick={() => actions.onArchive(habit)}>
                <Archive className="h-4 w-4" aria-hidden />
                Archive
              </Button>
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-transparent px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete
              </button>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** The single-habit 12-week heatmap with its text equivalent. */
function HabitHistory({ habit, today }: { habit: Habit; today: string }) {
  const set = new Set(habit.done);
  const columns = heatmapWeeks(today, 12, (d) => (set.has(d) ? 1 : 0));
  const summary = heatmapSummary(columns);
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">Last 12 weeks</p>
      <div className="mt-2">
        <Heatmap
          columns={columns}
          label={`${habit.name}, last 12 weeks`}
          cellClass={(c) => (c.value > 0 ? HABIT_HEAT[habit.color] : "bg-gray-100")}
          describe={(c) => (c.value > 0 ? "done" : "not done")}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Done on {summary.activeDays} of the last {summary.days} days.
      </p>
    </div>
  );
}
