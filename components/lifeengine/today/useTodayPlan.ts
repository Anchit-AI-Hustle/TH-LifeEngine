"use client";

import { useCallback, useEffect, useState } from "react";
import { daysFromRulePlan, daysFromWeeklySchedule, type ViewDay } from "@/components/lifeengine/plan-view/model";

export type TodayPlan =
  | { status: "loading" }
  | { status: "error" }
  | { status: "none" }
  | {
      status: "ready";
      id: string;
      name: string;
      /** Plans saved for this account. */
      planCount: number;
      totalDays: number;
      /** Today's day in the plan, when the plan has one. */
      day: ViewDay | null;
      dayIndex: number;
      /** The plan itself loaded; false means only its name and link are known. */
      detailed: boolean;
    };

type ListedPlan = { id: string; planName?: string; dayCount?: number; createdAt?: string };

/** Days of a plan payload, the same way the plan page reads them. */
function planDays(plan: any): ViewDay[] {
  if (plan?.weekly_schedule) {
    const weekly = daysFromWeeklySchedule(plan.weekly_schedule);
    if (weekly.length) return weekly;
  }
  if (Array.isArray(plan?.days)) return daysFromRulePlan(plan.days);
  return [];
}

async function loadDays(planId: string): Promise<ViewDay[] | null> {
  const q = encodeURIComponent(planId);
  try {
    const res = await fetch(`/api/lifeengine/plan/detail?planId=${q}`, { cache: "no-store" });
    if (res.ok) {
      const days = planDays((await res.json())?.plan);
      if (days.length) return days;
    }
    const old = await fetch(`/api/lifeengine/getPlan?id=${q}`, { cache: "no-store" });
    if (old.ok) {
      const days = planDays((await old.json())?.plan);
      if (days.length) return days;
    }
  } catch {
    // fall through: the card still links to the plan
  }
  return null;
}

/** The newest saved plan and its day for today. */
export function useTodayPlan(): { plan: TodayPlan; retry: () => void } {
  const [plan, setPlan] = useState<TodayPlan>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setPlan({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/lifeengine/listPlans", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const plans = ((await res.json())?.plans ?? []) as ListedPlan[];
        if (!live) return;
        if (!plans.length) {
          setPlan({ status: "none" });
          return;
        }
        const latest = plans[0];
        const days = await loadDays(latest.id);
        if (!live) return;
        const dayIndex = days ? days.findIndex((d) => d.isToday) : -1;
        setPlan({
          status: "ready",
          id: latest.id,
          name: latest.planName || "Your plan",
          planCount: plans.length,
          totalDays: days?.length ?? latest.dayCount ?? 0,
          day: days && dayIndex >= 0 ? days[dayIndex] : null,
          dayIndex,
          detailed: Boolean(days),
        });
      } catch {
        if (live) setPlan({ status: "error" });
      }
    })();
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { plan, retry };
}
