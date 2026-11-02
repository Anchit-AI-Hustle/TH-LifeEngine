"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, HeartPulse, Moon, Salad, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { HabitTemplate } from "@/lib/habits/types";
import { TemplateButtons } from "./TodayHabits";
import { QuickSleepLog, type QuickLog } from "./LastNight";
import { primaryLink, secondaryLink } from "./ui";

const STARTERS: { href: string; label: string; hint: string; icon: LucideIcon; tint: string }[] = [
  { href: "/lifeengine/create", label: "Create plan", hint: "Yoga, movement and meals", icon: Sparkles, tint: "bg-indigo-50 text-indigo-600" },
  { href: "/lifeengine/fitness", label: "Build health profile", hint: "Keeps activity safe", icon: HeartPulse, tint: "bg-rose-50 text-rose-600" },
  { href: "/lifeengine/diet", label: "Diet builder", hint: "Meals for your needs", icon: Salad, tint: "bg-emerald-50 text-emerald-600" },
];

/** A compact row of the main things to start. */
export function StartSomething() {
  return (
    <section aria-labelledby="start-title">
      <h2 id="start-title" className="text-base font-semibold text-gray-900">
        Start something
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {STARTERS.map(({ href, label, hint, icon: Icon, tint }) => (
          <li key={href} className="min-w-0">
            <Link
              href={href}
              className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-gray-300 hover:bg-gray-50"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{label}</span>
                <span className="block text-xs text-gray-500">{hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white" aria-hidden>
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-gray-600">{body}</p>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}

/** First run: nothing logged, no habits, no plan. Three clear first steps. */
export function FirstRun({
  suggestions,
  onAddHabit,
  night,
  today,
  onLogSleep,
}: {
  suggestions: HabitTemplate[];
  onAddHabit: (t: HabitTemplate) => void;
  night: string;
  today: string;
  onLogSleep: (log: QuickLog) => void;
}) {
  const [sleepOpen, setSleepOpen] = useState(false);
  return (
    <section aria-labelledby="first-run-title" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 id="first-run-title" className="text-lg font-semibold text-gray-900">
        Welcome. Three steps to get going
      </h2>
      <p className="mt-1 text-sm text-gray-600">Do them in any order. Each takes a minute or less, and everything is synced to your account.</p>
      <ol className="mt-6 space-y-7">
        <Step n={1} title="Pick one daily habit" body="Small is the point. Tap one to add it, then tick it off here each day.">
          <TemplateButtons templates={suggestions} onAdd={onAddHabit} />
        </Step>
        <Step n={2} title="Log last night's sleep" body="Bedtime, wake time and how well you slept. After three nights you will see patterns.">
          {sleepOpen ? (
            <div className="max-w-md">
              <QuickSleepLog night={night} today={today} defaults={{ bedtime: "23:00", wake: "07:00" }} onSave={onLogSleep} idPrefix="first-sleep" />
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setSleepOpen(true)}>
              <Moon className="h-4 w-4" aria-hidden />
              Log last night
            </Button>
          )}
        </Step>
        <Step n={3} title="Create your wellness plan" body="Add who it is for, pick yoga, diet or fitness, and get a day-by-day plan in under a minute.">
          <div className="flex flex-wrap gap-2">
            <Link href="/lifeengine/create" className={primaryLink}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Create a plan
            </Link>
            <Link href="/lifeengine/fitness" className={secondaryLink}>
              <HeartPulse className="h-4 w-4" aria-hidden />
              Build a health profile
            </Link>
          </div>
        </Step>
      </ol>
    </section>
  );
}
