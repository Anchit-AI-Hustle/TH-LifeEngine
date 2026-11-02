"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Check, CheckCircle2, Clock, CloudCheck, Flame, Plus } from "lucide-react";
import { HABIT_COLORS, HABIT_ICONS } from "@/components/lifeengine/habits/palette";
import { dayTotals, doneThisWeek, habitStreaks, plural, targetLabel } from "@/lib/habits/logic";
import type { Habit, HabitTemplate } from "@/lib/habits/types";
import { CardHeader, cardClass, textLink } from "./ui";

/** One-tap buttons for ready-made habits. */
export function TemplateButtons({ templates, onAdd }: { templates: HabitTemplate[]; onAdd: (t: HabitTemplate) => void }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-3">
      {templates.map((t) => {
        const Icon = HABIT_ICONS[t.icon].icon;
        return (
          <li key={t.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onAdd(t)}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:border-gray-300 hover:bg-gray-50"
            >
              <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", HABIT_COLORS[t.color].soft)}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 break-words">{t.name}</span>
              <Plus className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <span className="sr-only">(add habit)</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function HabitRow({ habit, today, onToggle }: { habit: Habit; today: string; onToggle: (h: Habit) => void }) {
  const color = HABIT_COLORS[habit.color];
  const Icon = HABIT_ICONS[habit.icon].icon;
  const done = habit.done.includes(today);
  const streak = habitStreaks(habit, today);
  const weekly = habit.target.kind === "weekly" ? `${doneThisWeek(habit, today)}/${habit.target.perWeek} this week` : null;
  return (
    <li>
      <button
        type="button"
        aria-pressed={done}
        onClick={() => onToggle(habit)}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-gray-50 sm:px-3"
      >
        <span
          className={clsx(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
            done ? `${color.solid} ${color.border}` : `border-gray-300 bg-white ${color.text}`,
          )}
          aria-hidden
        >
          {done ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <Icon className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={clsx("block break-words text-sm font-semibold", done ? "text-gray-500 line-through decoration-gray-300" : "text-gray-900")}>
            {habit.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span>{weekly ?? targetLabel(habit.target)}</span>
            {habit.reminder ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                <span className="break-words">{habit.reminder}</span>
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-gray-900" title="Current streak">
          <Flame className={clsx("h-4 w-4", streak.current > 0 ? "text-amber-500" : "text-gray-300")} aria-hidden />
          {streak.current}
          <span className="sr-only">{streak.unit === "day" ? "day" : "week"} streak</span>
        </span>
        <span className="sr-only">{done ? ", done today" : ", not done yet"}</span>
      </button>
    </li>
  );
}

export function TodayHabits({
  habits,
  today,
  suggestions,
  onToggle,
  onAdd,
}: {
  habits: Habit[];
  today: string;
  suggestions: HabitTemplate[];
  onToggle: (h: Habit) => void;
  onAdd: (t: HabitTemplate) => void;
}) {
  const { done, total } = dayTotals(habits, today);
  const allDone = total > 0 && done === total;
  return (
    <section aria-labelledby="today-habits-title" className={cardClass}>
      <CardHeader
        id="today-habits-title"
        title="Today's habits"
        description={
          habits.length === 0
            ? "Nothing to tick yet. Add one small habit to start."
            : allDone
              ? total === 1
                ? "Done for today."
                : `All ${plural(total, "habit")} done for today.`
              : `${done} of ${plural(total, "habit")} done. Tap one when it is done.`
        }
        aside={
          habits.length > 0 ? (
            <span className="text-sm font-semibold tabular-nums text-gray-900">
              {done}/{total}
            </span>
          ) : null
        }
      />

      {habits.length > 0 ? (
        <>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-label="Habits done today"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
          >
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          {allDone ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              Nicely done. See you tomorrow.
            </p>
          ) : null}
          <ul className="-mx-2 mt-3 space-y-1 sm:-mx-3">
            {habits.map((h) => (
              <HabitRow key={h.id} habit={h} today={today} onToggle={onToggle} />
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-4">
          <TemplateButtons templates={suggestions} onAdd={onAdd} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-gray-100 pt-3">
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <CloudCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Synced to your account
        </p>
        <Link href="/lifeengine/habits" className={textLink}>
          {habits.length ? "Streaks and challenges" : "Browse all habits"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
