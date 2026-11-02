"use client";

import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, CalendarDays, Dumbbell, Leaf, PersonStanding, RefreshCw, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { ViewDay } from "@/components/lifeengine/plan-view/model";
import type { TodayPlan } from "./useTodayPlan";
import { CardHeader, cardClass, primaryLink, secondaryLink } from "./ui";

function Row({ icon: Icon, tint, title, children }: { icon: LucideIcon; tint: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tint)}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <div className="mt-0.5 text-sm text-gray-600">{children}</div>
      </div>
    </li>
  );
}

function names(items: string[], max = 3) {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown} and ${items.length - max} more` : shown;
}

function DaySummary({ day }: { day: ViewDay }) {
  const yogaTime = day.yoga?.chips.find((c) => c.kind === "time")?.text;
  const rows: React.ReactNode[] = [];
  if (day.yoga && day.yoga.poses.length) {
    rows.push(
      <Row key="yoga" icon={PersonStanding} tint="bg-indigo-50 text-indigo-600" title="Yoga">
        {[`${day.yoga.poses.length} ${day.yoga.poses.length === 1 ? "pose" : "poses"}`, yogaTime].filter(Boolean).join(" · ")}
        <span className="block break-words text-xs text-gray-500">{names(day.yoga.poses.map((p) => p.name))}</span>
      </Row>,
    );
  }
  if (day.exercises.length) {
    rows.push(
      <Row key="ex" icon={Dumbbell} tint="bg-emerald-50 text-emerald-600" title="Movement">
        <span className="break-words">{names(day.exercises.map((e) => e.name))}</span>
      </Row>,
    );
  }
  if (day.meals.length) {
    rows.push(
      <Row key="meals" icon={UtensilsCrossed} tint="bg-amber-50 text-amber-600" title="Meals">
        <ul className="space-y-0.5">
          {day.meals.slice(0, 4).map((m, i) => (
            <li key={`${m.label}-${i}`} className="break-words">
              <span className="text-gray-500">{m.label}:</span> {m.title}
            </li>
          ))}
          {day.meals.length > 4 ? <li className="text-xs text-gray-500">and {day.meals.length - 4} more</li> : null}
        </ul>
      </Row>,
    );
  }
  if (!rows.length) {
    rows.push(
      <Row key="rest" icon={Leaf} tint="bg-gray-100 text-gray-600" title={day.restDay ? "Rest day" : "A light day"}>
        {day.note || day.tips[0]?.text || "Nothing scheduled. Take it easy and keep up your habits."}
      </Row>,
    );
  }
  return <ul className="mt-4 space-y-4">{rows}</ul>;
}

/** The newest plan's day for today, or a nudge to create one. */
export function TodayPlanCard({ plan, onRetry }: { plan: TodayPlan; onRetry: () => void }) {
  return (
    <section aria-labelledby="today-plan-title" className={cardClass}>
      {plan.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading your plan">
          <CardHeader id="today-plan-title" title="Today's plan" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      ) : plan.status === "error" ? (
        <>
          <CardHeader id="today-plan-title" title="Today's plan" />
          <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center">
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Your plans could not be loaded. Check your connection.
            </span>
            <button type="button" onClick={onRetry} className={secondaryLink}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </button>
          </div>
        </>
      ) : plan.status === "none" ? (
        <>
          <CardHeader id="today-plan-title" title="Today's plan" description="No plan yet. A plan puts yoga, movement and meals for each day in one place." />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/lifeengine/create" className={primaryLink}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Create a plan
            </Link>
            <Link href="/lifeengine/plan-demo" className={secondaryLink}>
              See an example
            </Link>
          </div>
        </>
      ) : (
        <>
          <CardHeader
            id="today-plan-title"
            title="Today's plan"
            description={
              <span className="break-words">
                {plan.name}
                {plan.day ? ` · ${plan.day.label} of ${plan.totalDays}${plan.day.sublabel ? `, ${plan.day.sublabel}` : ""}` : ""}
              </span>
            }
          />
          {plan.day ? (
            <DaySummary day={plan.day} />
          ) : (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              {plan.detailed
                ? `Your latest plan has no day for today. Open it to read any of its ${plan.totalDays} ${plan.totalDays === 1 ? "day" : "days"}, or create a new one.`
                : "Open the plan to see what is on for today."}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/lifeengine/plan/${encodeURIComponent(plan.id)}`} className={primaryLink}>
              {plan.day ? "Open today's plan" : "Open plan"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/lifeengine/dashboard" className={secondaryLink}>
              {plan.planCount > 1 ? `All ${plan.planCount} plans` : "Dashboard"}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
